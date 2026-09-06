/**
 * Signed session tokens — a ~90 line replacement for NextAuth's JWT sessions.
 *
 * The token is a standard compact JWS (`base64url(header).base64url(payload)
 * .base64url(signature)`) signed with HMAC-SHA256, so it can be inspected with
 * jwt.io or any other JWT tooling. It is built on the Web Crypto API, which
 * means the same code runs in Node route handlers, server components and
 * (should we ever add one) middleware — no `jose`, no `next-auth`, no engine
 * binaries.
 *
 * Everything user-facing lives in the payload: `sub` (user id), `email`,
 * `name`, `plan`, `iat` and `exp`. src/lib/auth.ts re-reads the user from the
 * database on each request so `plan` changes (e.g. a premium purchase) are
 * picked up without forcing a re-login.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Fallback used when no secret is configured (development only). */
const DEV_SECRET = "goaledge-secret-key-change-in-production";

/** 30 days, in seconds — matches the previous NextAuth session maxAge. */
export const DEFAULT_SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export interface SessionClaims {
  /** User id. */
  sub: string;
  email: string;
  name?: string | null;
  plan?: string;
  /** Issued-at, unix seconds. */
  iat: number;
  /** Expires-at, unix seconds. */
  exp: number;
}

export interface SessionTokenUser {
  id: string;
  email: string;
  name?: string | null;
  plan?: string | null;
}

let warnedAboutSecret = false;

/**
 * The secret used to sign/verify tokens. Reads AUTH_SECRET first and falls
 * back to the legacy NEXTAUTH_SECRET so existing deployments keep working
 * (their cookies stay valid across the upgrade).
 */
export function sessionSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (!warnedAboutSecret) {
    warnedAboutSecret = true;
    console.warn(
      "[auth] AUTH_SECRET is not set — falling back to a public development secret. " +
        "Generate one with `openssl rand -base64 32` and set AUTH_SECRET before deploying."
    );
  }
  return DEV_SECRET;
}

/* ------------------------------------------------------------------ */
/*  base64url helpers (no Buffer, so this also runs on the edge)       */
/* ------------------------------------------------------------------ */

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// No explicit return type: TS infers Uint8Array<ArrayBuffer>, which is what
// crypto.subtle.verify() accepts as a BufferSource.
function base64UrlToBytes(value: string) {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function encodeSegment(value: string): string {
  return bytesToBase64Url(encoder.encode(value));
}

function decodeSegment(value: string): string {
  return decoder.decode(base64UrlToBytes(value));
}

/* ------------------------------------------------------------------ */
/*  HMAC key (cached — importing a key on every request is wasteful)   */
/* ------------------------------------------------------------------ */

let cachedKey: { secret: string; key: CryptoKey } | null = null;

async function signingKey(secret: string): Promise<CryptoKey> {
  if (cachedKey?.secret === secret) return cachedKey.key;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  cachedKey = { secret, key };
  return key;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface IssuedToken {
  token: string;
  /** When the token (and therefore the cookie) expires. */
  expiresAt: Date;
  claims: SessionClaims;
}

/** Create a signed session token for a user. */
export async function createSessionToken(
  user: SessionTokenUser,
  maxAgeSeconds: number = DEFAULT_SESSION_MAX_AGE
): Promise<IssuedToken> {
  const iat = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((iat + maxAgeSeconds) * 1000);
  const claims: SessionClaims = {
    sub: user.id,
    email: user.email,
    name: user.name ?? null,
    plan: user.plan ?? "free",
    iat,
    exp: Math.floor(expiresAt.getTime() / 1000),
  };

  const header = encodeSegment(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encodeSegment(JSON.stringify(claims));
  const data = `${header}.${payload}`;
  const key = await signingKey(sessionSecret());
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(data))
  );

  return { token: `${data}.${bytesToBase64Url(signature)}`, expiresAt, claims };
}

/**
 * Verify a token's signature and expiry.
 * Returns the claims when valid, `null` for anything else (missing, malformed,
 * tampered with, signed with a different secret, expired, or issued in the
 * future beyond a small clock-skew allowance).
 */
export async function verifySessionToken(
  token: string | null | undefined
): Promise<SessionClaims | null> {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const [headerSegment, payloadSegment, signatureSegment] = parts;

    // Pin the algorithm: rejects {"alg":"none"} and any non-HMAC token.
    const header = JSON.parse(decodeSegment(headerSegment)) as {
      alg?: string;
      typ?: string;
    };
    if (header?.alg !== "HS256" || header?.typ !== "JWT") return null;

    const data = `${headerSegment}.${payloadSegment}`;
    const key = await signingKey(sessionSecret());
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(signatureSegment),
      encoder.encode(data)
    );
    if (!valid) return null;

    const claims = JSON.parse(decodeSegment(payloadSegment)) as SessionClaims;
    if (typeof claims?.sub !== "string" || typeof claims?.email !== "string") {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (typeof claims.exp !== "number" || claims.exp <= now) return null;
    if (typeof claims.iat === "number" && claims.iat > now + 60) return null;

    return claims;
  } catch {
    return null;
  }
}
