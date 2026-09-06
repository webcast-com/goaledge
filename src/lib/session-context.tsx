"use client";

/**
 * Client session context — the replacement for next-auth/react's
 * `SessionProvider`, `useSession()` and `signOut()`.
 *
 * The session itself lives in an HttpOnly cookie the client cannot read, so the
 * provider simply asks `GET /api/auth/session` on mount (and again when the tab
 * regains focus) and keeps the result in React state. Sign-in/sign-up/sign-out
 * are plain `fetch` calls — no CSRF token, no hidden form submit, no page
 * reload.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  AuthResult,
  Session,
  SessionStatus,
  SignUpInput,
} from "@/types/auth";

interface SessionContextValue {
  /** The current session, or null for a guest. */
  session: Session | null;
  /** Same value as `session`, named for next-auth's `useSession().data`. */
  data: Session | null;
  status: SessionStatus;
  /** True while the very first session lookup is in flight. */
  loading: boolean;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(input: SignUpInput): Promise<AuthResult>;
  signOut(): Promise<void>;
  /** Re-read the session from the server (e.g. after a payment upgrades it). */
  refresh(): Promise<Session | null>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

async function readJson(url: string, init?: RequestInit): Promise<{
  ok: boolean;
  status: number;
  data: Record<string, unknown> | null;
}> {
  const res = await fetch(url, init);
  let data: Record<string, unknown> | null = null;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

function asSession(value: unknown): Session | null {
  const user = (value as Session | null)?.user;
  if (!user || typeof user.id !== "string" || typeof user.email !== "string") {
    return null;
  }
  return value as Session;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  const applySession = useCallback((next: Session | null) => {
    setSession(next);
    setStatus(next ? "authenticated" : "unauthenticated");
  }, []);

  const refresh = useCallback(async (): Promise<Session | null> => {
    try {
      const { ok, data } = await readJson("/api/auth/session", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const next = ok ? asSession(data?.session) : null;
      applySession(next);
      return next;
    } catch {
      // Offline / server hiccup: treat as signed out rather than stuck loading.
      applySession(null);
      return null;
    }
  }, [applySession]);

  // Initial load.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Pick up changes made elsewhere (another tab, a completed payment that
  // flips the plan to premium, an admin downgrade…).
  useEffect(() => {
    const onFocus = () => void refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const { ok, data } = await readJson("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ email, password }),
        });
        const next = asSession(data?.session);
        if (!ok || !next) {
          return {
            ok: false,
            error:
              (typeof data?.error === "string" && data.error) ||
              "Invalid email or password",
          };
        }
        applySession(next);
        return { ok: true, session: next };
      } catch {
        return { ok: false, error: "Network error. Please try again." };
      }
    },
    [applySession]
  );

  const signUp = useCallback(
    async (input: SignUpInput): Promise<AuthResult> => {
      try {
        const { ok, data } = await readJson("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(input),
        });
        const next = asSession(data?.session);
        if (!ok) {
          return {
            ok: false,
            error:
              (typeof data?.error === "string" && data.error) ||
              "Registration failed",
          };
        }
        // Registration signs you in; if the cookie somehow didn't land, fall
        // back to a session read so the UI still settles.
        if (next) applySession(next);
        else await refresh();
        const referral = data?.referral as AuthResult["referral"];
        return { ok: true, session: next, referral };
      } catch {
        return { ok: false, error: "Network error. Please try again." };
      }
    },
    [applySession, refresh]
  );

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // Even if the request fails, drop the local session: the cookie is
      // HttpOnly and short-lived enough that this stays consistent.
    }
    applySession(null);
  }, [applySession]);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      data: session,
      status,
      loading: status === "loading",
      signIn,
      signUp,
      signOut,
      refresh,
    }),
    [session, status, signIn, signUp, signOut, refresh]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error(
      "useSession/useAuth must be used inside <SessionProvider> (see src/app/layout.tsx)"
    );
  }
  return ctx;
}

/**
 * Drop-in replacement for next-auth's `useSession()`:
 * `const { data: session, status } = useSession();`
 */
export function useSession() {
  const { data, status, refresh } = useSessionContext();
  return { data, status, update: refresh };
}

/** Full auth API — `const { data, signIn, signUp, signOut } = useAuth();` */
export function useAuth(): SessionContextValue {
  return useSessionContext();
}
