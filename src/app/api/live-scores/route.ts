import { NextResponse } from "next/server";
import {
  isApiConfigured,
  getLiveMatches,
  convertToLiveScore,
  getSeedLiveScores,
  getUpstreamNote,
} from "@/lib/football-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (await isApiConfigured()) {
      const liveMatches = await getLiveMatches();

      if (liveMatches.length > 0) {
        const liveScores = liveMatches.map(convertToLiveScore);

        return NextResponse.json({
          matches: liveScores,
          source: "live",
          apiConfigured: true,
          count: liveScores.length,
        });
      }
    }

    const configured = await isApiConfigured();

    // Fallback: seed data
    return NextResponse.json({
      matches: getSeedLiveScores(),
      source: configured ? "no_live_matches" : "seed",
      apiConfigured: configured,
      count: configured ? 0 : 2,
      note: getUpstreamNote(),
    });
  } catch (error) {
    console.error("Live scores API error:", error);
    return NextResponse.json({
      matches: getSeedLiveScores(),
      source: "fallback",
      apiConfigured: false,
    });
  }
}