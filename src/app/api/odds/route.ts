import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSeedTips } from "@/lib/football-api";
import {
  getOddsComparison,
  type OddsComparableTip,
} from "@/lib/odds-comparison";

export const dynamic = "force-dynamic";

/**
 * GET /api/odds
 * Returns per-bookmaker odds comparisons for current tips.
 * ?tipId=xxx → a single comparison for that tip.
 */
export async function GET(request: NextRequest) {
  try {
    const tipId = request.nextUrl.searchParams.get("tipId");

    let tips: OddsComparableTip[] = [];
    try {
      const dbTips = await db.orm.Tip.where({ status: "upcoming" })
        .orderBy((t) => t.createdAt.desc())
        .limit(20)
        .select("id", "odds", "homeTeam", "awayTeam", "prediction")
        .all();
      tips = dbTips.map((t) => ({
        id: t.id,
        odds: t.odds,
        homeTeam: t.homeTeam,
        awayTeam: t.awayTeam,
        prediction: t.prediction,
      }));
    } catch {
      // DB not ready — fall through to seed data
    }

    if (tips.length === 0) {
      tips = getSeedTips().map((t) => ({
        id: t.id,
        odds: t.odds,
        homeTeam: t.homeTeam,
        awayTeam: t.awayTeam,
        prediction: t.prediction,
      }));
    }

    if (tipId) {
      let tip = tips.find((t) => t.id === tipId);
      if (!tip) {
        try {
          const dbTip = await db.orm.Tip.where({ id: tipId })
            .select("id", "odds", "homeTeam", "awayTeam", "prediction")
            .first();
          if (dbTip) tip = dbTip;
        } catch {
          // ignore
        }
      }
      if (!tip) {
        return NextResponse.json({ error: "Tip not found" }, { status: 404 });
      }
      return NextResponse.json({ comparison: getOddsComparison(tip) });
    }

    return NextResponse.json({
      comparisons: tips.map(getOddsComparison),
      source: "database",
    });
  } catch (error) {
    console.error("Odds API error:", error);
    return NextResponse.json(
      { error: "Failed to load odds comparison" },
      { status: 500 }
    );
  }
}
