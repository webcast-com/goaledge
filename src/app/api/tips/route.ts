import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  isApiConfigured,
  getAllUpcomingMatches,
  generateTipsFromMatches,
  getSeedTips,
  getCompetitions,
  getUpstreamNote,
  type GeneratedTip,
} from "@/lib/football-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // If API is configured, fetch real data
    if (await isApiConfigured()) {
      const matches = await getAllUpcomingMatches(8);

      if (matches.length > 0) {
        const tips = generateTipsFromMatches(matches);

        // Store real tips in DB for persistence. Kept in its own try/catch: a DB
        // hiccup (locked SQLite file, missing table, …) must not throw the whole
        // route into the seed fallback — that is how "live matches" turned into
        // "demo tips" without any visible error.
        try {
          for (const tip of tips) {
            await db.tip.upsert({
              where: { id: tip.id },
              create: {
                id: tip.id,
                league: tip.league,
                country: tip.country,
                flag: tip.flag,
                homeTeam: tip.homeTeam,
                awayTeam: tip.awayTeam,
                matchTime: tip.matchTime,
                predictionType: tip.predictionType,
                prediction: tip.prediction,
                odds: tip.odds,
                confidence: tip.confidence,
                confidenceLabel: tip.confidenceLabel,
                status: "upcoming",
                tipster: tip.tipster,
                isPremium: tip.isPremium,
              },
              update: {
                league: tip.league,
                homeTeam: tip.homeTeam,
                awayTeam: tip.awayTeam,
                matchTime: tip.matchTime,
                prediction: tip.prediction,
                odds: tip.odds,
                confidence: tip.confidence,
                confidenceLabel: tip.confidenceLabel,
              },
            });
          }
        } catch (dbError) {
          console.error(
            "[tips] could not persist live tips to the database — serving them anyway:",
            dbError
          );
        }

        const competitions = await getCompetitions();

        return NextResponse.json({
          tips,
          source: "live",
          apiConfigured: true,
          totalAvailable: matches.length,
          competitions,
        });
      }
    }

    // Fallback: check DB first, then seed (featured board = upcoming only)
    const dbTips = await db.tip.findMany({
      where: { status: "upcoming" },
      orderBy: { createdAt: "desc" },
      take: 12,
    });

    if (dbTips.length > 0) {
      const formatted: GeneratedTip[] = dbTips.map((t) => ({
        id: t.id,
        league: t.league,
        country: t.country,
        flag: t.flag,
        homeTeam: t.homeTeam,
        awayTeam: t.awayTeam,
        matchTime: t.matchTime,
        predictionType: t.predictionType,
        prediction: t.prediction,
        odds: t.odds,
        confidence: t.confidence,
        confidenceLabel: t.confidenceLabel,
        status: t.status,
        tipster: t.tipster,
        isPremium: t.isPremium,
        homeTeamCrest: "",
        awayTeamCrest: "",
        matchId: 0,
        competitionCode: "",
      }));

      return NextResponse.json({
        tips: formatted,
        source: "database",
        apiConfigured: await isApiConfigured(),
        note: getUpstreamNote(),
      });
    }

    return NextResponse.json({
      tips: getSeedTips(),
      source: "seed",
      apiConfigured: await isApiConfigured(),
      note: getUpstreamNote(),
    });
  } catch (error) {
    console.error("Tips API error:", error);

    // Ultimate fallback
    return NextResponse.json({
      tips: getSeedTips(),
      source: "fallback",
      apiConfigured: await isApiConfigured(),
      note: getUpstreamNote(),
    });
  }
}