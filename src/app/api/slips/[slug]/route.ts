import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface SlipLeg {
  homeTeam: string;
  awayTeam: string;
  league: string;
  prediction: string;
  predictionType: string;
  odds: string;
  matchTime: string;
}

/**
 * GET /api/slips/[slug]
 * Public data for a shared bet slip (no personal info beyond the slip itself).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const slip = await db.orm.SharedSlip.first({ slug });

    if (!slip) {
      return NextResponse.json({ error: "Slip not found" }, { status: 404 });
    }

    let legs: SlipLeg[] = [];
    try {
      const parsed = JSON.parse(slip.legs);
      legs = Array.isArray(parsed) ? parsed : [];
    } catch {
      // invalid stored legs — return empty
    }

    return NextResponse.json({
      slug: slip.slug,
      legs,
      stake: slip.stake,
      totalOdds: slip.totalOdds,
      potentialReturn: slip.potentialReturn,
      createdAt: slip.createdAt,
    });
  } catch (error) {
    console.error("Get slip error:", error);
    return NextResponse.json({ error: "Failed to load slip" }, { status: 500 });
  }
}
