import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeCode } from "@/lib/referrals";

/**
 * POST /api/referrals/validate
 * Body: { code }
 * Returns whether the code is valid and who it belongs to.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = normalizeCode(typeof body?.code === "string" ? body.code : "");

    if (!code) {
      return NextResponse.json({ valid: false, error: "Enter a referral code" });
    }

    const referrer = await db.orm.User.where({ referralCode: code })
      .select("name", "email")
      .first();

    if (!referrer) {
      return NextResponse.json({ valid: false, error: "That code doesn't exist" });
    }

    return NextResponse.json({
      valid: true,
      referrerName: referrer.name || referrer.email?.split("@")[0] || "a GoalEdge member",
    });
  } catch {
    return NextResponse.json({ valid: false, error: "Something went wrong" }, { status: 500 });
  }
}
