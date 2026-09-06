/**
 * Server-side authentication helpers.
 *
 * This replaces the NextAuth configuration that used to live here. GoalEdge only
 * ever used the credentials provider, so the whole flow is now a handful of
 * explicit functions:
 *
 *   hashPassword / verifyPassword  — bcryptjs, same cost factor as before (12)
 *   findUserByEmail                — tolerant lookup (emails are stored lowercase)
 *   createSession + setSessionCookie — sign a token and set the session cookie
 *   getSessionUser                 — reads + verifies the cookie on a request
 *   clearSession                   — expires the cookie (sign out)
 *
 * The session cookie is HttpOnly, SameSite=Lax, path=/ and Secure whenever the
 * request came in over HTTPS. Client code never sees the token; it asks
 * GET /api/auth/session for the user object.
 */

// Server-only: imports Prisma/bcryptjs and touches cookies. Client code should
// use the session context in src/lib/session-context.tsx instead.

import bcrypt from "bcryptjs";
import type { NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  DEFAULT_SESSION_MAX_AGE,
  createSessionToken,
  verifySessionToken,
} from "@/lib/session-token";
import type { Session, SessionUser } from "@/types/auth";

/** Name of the HttpOnly cookie holding the signed session token. */
export const SESSION_COOKIE = "goaledge.session";

/** Session lifetime in seconds (30 days). */
export const SESSION_MAX_AGE = DEFAULT_SESSION_MAX_AGE;

/* ------------------------------------------------------------------ */
/*  Passwords                                                          */
/* ------------------------------------------------------------------ */

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Users                                                              */
/* ------------------------------------------------------------------ */

/** Emails are normalised before they are stored or looked up. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  image: true,
  plan: true,
} as const;

type DbUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  plan: string;
};

/** Strip everything sensitive (password hash) before a user leaves the server. */
export function toSessionUser(user: DbUser): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    plan: user.plan,
  };
}

/**
 * Look a user up by email address.
 *
 * New accounts are stored lowercase, so the unique index answers the common
 * case in one query. Older rows may still hold a mixed-case address
 * (`Foo@Bar.com`), which an exact lookup would miss, so on a miss we retry with
 * the address as typed and then with a case-insensitive SQL match. The row is
 * returned exactly as stored: other tables (PlacedBet, Payment, …) key off the
 * email string, so rewriting it here would orphan that history.
 */
export async function findUserByEmail(
  email: string
): Promise<DbUser | null> {
  const trimmed = email.trim();
  const normalized = normalizeEmail(trimmed);
  if (!normalized) return null;

  const exact = await db.user.findUnique({
    where: { email: normalized },
    select: userSelect,
  });
  if (exact) return exact;

  if (trimmed !== normalized) {
    const asTyped = await db.user.findUnique({
      where: { email: trimmed },
      select: userSelect,
    });
    if (asTyped) return asTyped;
  }

  const rows = await db.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM User WHERE LOWER(email) = ${normalized} LIMIT 1
  `;
  const legacyId = rows[0]?.id;
  if (!legacyId) return null;

  return db.user.findUnique({
    where: { id: legacyId },
    select: userSelect,
  });
}

/**
 * Verify an email/password pair.
 * Returns the user on success, or a stable error string that never reveals
 * whether the email exists.
 */
export async function authenticateWithPassword(
  email: string,
  password: string
): Promise<{ user: SessionUser } | { error: string }> {
  const user = await findUserByEmail(email);
  if (!user) return { error: "Invalid email or password" };

  const passwordRow = await db.user.findUnique({
    where: { id: user.id },
    select: { password: true },
  });
  if (!passwordRow?.password) {
    return { error: "Invalid email or password" };
  }

  const valid = await verifyPassword(password, passwordRow.password);
  if (!valid) return { error: "Invalid email or password" };

  return { user: toSessionUser(user) };
}

/* ------------------------------------------------------------------ */
/*  Cookies                                                            */
/* ------------------------------------------------------------------ */

/** True when the request arrived over HTTPS (directly or via a proxy). */
export function isSecureRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

function cookieOptions(request: Request) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: isSecureRequest(request),
    maxAge: SESSION_MAX_AGE,
  };
}

/** Pull the session token out of a request's Cookie header. */
export function readSessionToken(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== SESSION_COOKIE) continue;
    const value = part.slice(separator + 1).trim();
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

export interface PendingSession {
  /** Signed token to store in the cookie. */
  token: string;
  expiresAt: Date;
  /** The session object to return to the client. */
  session: Session;
}

/**
 * Sign a session token for `user`. Pair with `setSessionCookie()` — keeping the
 * two apart lets a route put the session in its JSON body *and* set the cookie.
 */
export async function createSession(user: SessionUser): Promise<PendingSession> {
  const { token, expiresAt } = await createSessionToken(user, SESSION_MAX_AGE);
  return {
    token,
    expiresAt,
    session: { user, expires: expiresAt.toISOString() },
  };
}

/** Attach a pending session to a response as the HttpOnly session cookie. */
export function setSessionCookie(
  response: NextResponse,
  request: Request,
  pending: PendingSession
): void {
  response.cookies.set(SESSION_COOKIE, pending.token, {
    ...cookieOptions(request),
    expires: pending.expiresAt,
  });
}

/** Expire the session cookie (sign out). */
export function clearSession(
  response: NextResponse,
  request: Request
): void {
  response.cookies.set(SESSION_COOKIE, "", {
    ...cookieOptions(request),
    maxAge: 0,
    expires: new Date(0),
  });
}

/* ------------------------------------------------------------------ */
/*  Reading the current user                                           */
/* ------------------------------------------------------------------ */

function userFromClaims(claims: {
  sub: string;
  email: string;
  name?: string | null;
  plan?: string;
}): SessionUser {
  return {
    id: claims.sub,
    email: claims.email,
    name: claims.name ?? null,
    image: null,
    plan: claims.plan ?? "free",
  };
}

/**
 * Resolve the signed-in user for a request, or `null` when the cookie is
 * missing/invalid/expired.
 *
 * The token is verified first, then the user is re-read from the database so
 * profile edits and plan changes (premium purchase, referral bonus, admin
 * downgrade) show up without waiting for the token to expire. A deleted account
 * invalidates the session immediately. If the database itself is unreachable we
 * fall back to the signed claims rather than signing the user out.
 */
export async function getSessionUser(
  request: Request
): Promise<SessionUser | null> {
  const claims = await verifySessionToken(readSessionToken(request));
  if (!claims) return null;

  try {
    const user = await db.user.findUnique({
      where: { id: claims.sub },
      select: userSelect,
    });
    if (!user) return null;
    return toSessionUser(user);
  } catch (error) {
    console.error("[auth] session user lookup failed:", error);
    return userFromClaims(claims);
  }
}

/**
 * Which account is this request about?
 *
 * A verified session always wins — that is what stops someone reading another
 * user's bets or payments by editing an `?email=` query string. Signed-out
 * visitors fall back to the email they supplied, which the guest/demo flows in
 * the UI rely on. The address is returned exactly as stored so it keeps
 * matching rows in tables keyed by email (PlacedBet, Payment, …).
 */
export async function resolveRequestEmail(
  request: Request,
  provided?: string | null
): Promise<string | null> {
  const user = await getSessionUser(request);
  if (user) return user.email;
  const trimmed = typeof provided === "string" ? provided.trim() : "";
  return trimmed || null;
}

/** The session object for a user, expiring `SESSION_MAX_AGE` from now. */
export function buildSession(user: SessionUser, expires?: Date): Session {
  const expiresAt =
    expires ?? new Date(Date.now() + SESSION_MAX_AGE * 1000);
  return { user, expires: expiresAt.toISOString() };
}
