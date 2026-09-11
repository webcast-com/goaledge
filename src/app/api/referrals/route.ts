import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRequestEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/referrals?email=xxx
 * Returns the user's referral code/link plus their referrals with statuses.
 */
export async function GET(request: NextRequest) {
  try {
    // A verified session wins over the ?email= query string.
    const email = await resolveRequestEmail(request, request.nextUrl.searchParams.get("email"));
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await db.orm.User.where({ email })
      .select("id", "email", "name", "referralCode")
      .first();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.referralCode) {
      // Backfill for accounts created before referral codes existed.
      const { generateReferralCode } = await import("@/lib/referrals");
      let code = generateReferralCode();
      for (let attempt = 0; attempt < 5; attempt++) {
        const clash = await db.orm.User.where({ referralCode: code }).first();
        if (!clash) break;
        code = generateReferralCode();
      }
      await db.orm.User.where({ id: user.id }).update({ referralCode: code });
      user.referralCode = code;
    }

    const referrals = await db.orm.Referral.where({ referrerId: user.id })
      .include("referred", (r) => r.select("name", "email"))
      .orderBy((r) => r.createdAt.desc())
      .all();

    // Count premium days earned from rewarded referrals.
    const rewards = await db.orm.Payment.where({
      userId: user.id,
      plan: "referral_reward",
      status: "completed",
    })
      .select("amount", "createdAt")
      .all();

    const stats = {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === "pending").length,
      qualified: referrals.filter((r) => r.status === "qualified").length,
      rewarded: referrals.filter((r) => r.status === "rewarded").length,
      rewardDaysEarned: rewards.length * 7,
    };

    return NextResponse.json({
      code: user.referralCode,
      link: `/?ref=${user.referralCode}`,
      stats,
      rewards,
      referrals: referrals.map((r) => ({
        id: r.id,
        code: r.code,
        status: r.status,
        rewardDays: r.rewardDays,
        createdAt: r.createdAt,
        qualifiedAt: r.qualifiedAt,
        rewardedAt: r.rewardedAt,
        referred: {
          name: r.referred.name,
          email: r.referred.email ? maskEmail(r.referred.email) : null,
        },
      })),
    });
  } catch (error) {
    console.error("Referrals API error:", error);
    return NextResponse.json({ error: "Failed to load referrals" }, { status: 500 });
  }
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user.slice(0, 2)}***@${domain}`;
}
