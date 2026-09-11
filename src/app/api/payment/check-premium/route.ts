import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRequestEmail } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // A verified session wins over the ?email= query string.
    const email = await resolveRequestEmail(request, searchParams.get("email"));

    if (!email) {
      return NextResponse.json(
        { error: "Missing email parameter" },
        { status: 400 }
      );
    }

    // Check user record
    const user = await db.orm.User.where({ email }).first();

    // Check for active payments with future expiry
    const activePayment = await db.orm.Payment.where({ email, status: "completed" })
      .where((pay) => pay.expiresAt.gte(new Date()))
      .orderBy((pay) => pay.expiresAt.desc())
      .first();

    const isPremium = user?.plan === "premium" || !!activePayment;
    let expiresAt: string | null = null;

    if (activePayment?.expiresAt) {
      expiresAt = activePayment.expiresAt.toISOString();
    } else if (user?.plan === "premium" && !activePayment) {
      // User has premium plan but no active payment — check if they have any completed payment
      const lastPayment = await db.orm.Payment.where({ email, status: "completed" })
        .orderBy((pay) => pay.createdAt.desc())
        .first();
      if (lastPayment?.expiresAt && lastPayment.expiresAt < new Date()) {
        // Premium has expired — downgrade user
        await db.orm.User.where({ id: user.id }).update({ plan: "free" });
        return NextResponse.json({
          isPremium: false,
          plan: "free",
          expiresAt: null,
          message: "Premium access has expired",
        });
      }
    }

    return NextResponse.json({
      isPremium,
      plan: isPremium ? "premium" : "free",
      expiresAt,
      userName: user?.name,
    });
  } catch (error) {
    console.error("Error checking premium status:", error);
    return NextResponse.json(
      { error: "Failed to check premium status" },
      { status: 500 }
    );
  }
}