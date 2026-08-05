import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/auth/reset-password
 * Body: { email: string }
 *
 * Demo implementation: no email provider is configured, so instead of
 * actually sending a reset link we always respond with a generic success
 * message (also avoids user enumeration). If a real mailer is added later,
 * generate a token here and send the reset link.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    // Check the account exists (but respond the same either way).
    const user = await db.user.findUnique({ where: { email }, select: { id: true } });

    if (user) {
      // TODO: send actual reset email (token + link) once an email provider is configured.
      console.log(`[reset-password] Reset requested for ${email}`);
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
