import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { newId } from "@/lib/ids";
import {
  createSession,
  findUserByEmail,
  hashPassword,
  normalizeEmail,
  setSessionCookie,
} from "@/lib/auth";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  generateReferralCode,
  normalizeCode,
  applyReferralOnSignup,
} from "@/lib/referrals";
import type { SessionUser } from "@/types/auth";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  referralCode: z.string().trim().max(20).optional(),
});

/**
 * POST /api/auth/register
 * Body: { name, email, password, referralCode? }
 *
 * Creates the account and signs the user straight in: the response carries the
 * session *and* sets the `goaledge.session` cookie, so the client no longer has
 * to submit a second (NextAuth credentials) request after signing up.
 */
export async function POST(request: Request) {
  // Rate limit: max 10 registrations per IP per minute
  const rl = rateLimit(`register:${getClientIp(request)}`, 10);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, password } = result.data;
    const email = normalizeEmail(result.data.email);
    const referralCode = result.data.referralCode
      ? normalizeCode(result.data.referralCode)
      : "";

    // Check if user already exists (case-insensitive, so "Foo@Bar.com" cannot be
    // registered twice with different casing).
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate a unique referral code for the new user
    let code = generateReferralCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const clash = await db.orm.User.where({ referralCode: code }).first();
      if (!clash) break;
      code = generateReferralCode();
    }

    // Create user
    const user = await db.orm.User.select(
      "id",
      "email",
      "name",
      "plan",
      "referralCode",
      "createdAt",
    ).create({
      id: newId(),
      name,
      email,
      password: hashedPassword,
      referralCode: code,
    });

    // Apply referral code if provided (links accounts + grants bonus days)
    const referral = await applyReferralOnSignup(db, user.id, user.email, referralCode);

    // Sign the new account in immediately.
    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      image: null,
      plan: user.plan,
    };
    const pending = await createSession(sessionUser);

    const response = NextResponse.json(
      {
        success: true,
        message: "Account created successfully!",
        user,
        referral,
        session: pending.session,
      },
      { status: 201 }
    );
    setSessionCookie(response, request, pending);
    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
