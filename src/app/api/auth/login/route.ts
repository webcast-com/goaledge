import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  authenticateWithPassword,
  createSession,
  normalizeEmail,
  setSessionCookie,
} from "@/lib/auth";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * Replaces NextAuth's `POST /api/auth/callback/credentials` (which needed a CSRF
 * token and a full-page form submit). On success it sets the HttpOnly
 * `goaledge.session` cookie and returns the session, so the client signs in
 * without reloading the page:
 *
 *   200 { success: true, user, session: { user, expires } }
 *   400 { error }  — malformed body
 *   401 { error }  — wrong email/password (never says which one)
 *   429            — rate limited
 */
export async function POST(request: NextRequest) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const result = loginSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const { email, password } = result.data;
  const ip = getClientIp(request);

  // Brute-force guard: 10 attempts per email + IP, and 30 per IP, per minute.
  const perAccount = rateLimit(`login:${ip}:${normalizeEmail(email)}`, 10);
  if (!perAccount.ok) return rateLimitResponse(perAccount.retryAfterSec);
  const perIp = rateLimit(`login-ip:${ip}`, 30);
  if (!perIp.ok) return rateLimitResponse(perIp.retryAfterSec);

  try {
    const auth = await authenticateWithPassword(email, password);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const pending = await createSession(auth.user);
    const response = NextResponse.json({
      success: true,
      message: "Signed in successfully",
      user: auth.user,
      session: pending.session,
    });
    setSessionCookie(response, request, pending);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
