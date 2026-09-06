/**
 * Shared auth types.
 *
 * These used to come from NextAuth's augmented `Session`/`User` interfaces
 * (see the deleted src/types/next-auth.d.ts). The app now owns its session
 * shape, and both the server helpers (src/lib/auth.ts) and the client context
 * (src/lib/session-context.tsx) build on these types.
 */

/** The user object exposed to the client — never contains the password hash. */
export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  /** "free" | "premium" — mirrors User.plan in the database. */
  plan: string;
}

/** What `/api/auth/session` returns and what the client context stores. */
export interface Session {
  user: SessionUser;
  /** ISO timestamp of when the session cookie expires. */
  expires: string;
}

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  referralCode?: string;
}

/** Result of a sign-in / sign-up attempt from the client. */
export interface AuthResult {
  ok: boolean;
  error?: string;
  session?: Session | null;
  /** Only set on sign-up: whether an invite code was applied. */
  referral?: { applied: boolean; referrerName?: string; bonusDays: number };
}
