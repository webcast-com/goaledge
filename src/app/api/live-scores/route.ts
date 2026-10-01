import { NextResponse } from "next/server";
import {
  isApiConfigured,
  getLiveMatches,
  convertToLiveScore,
  getSeedLiveScores,
  getUpstreamNote,
} from "@/lib/football-api";
import { getEspnDateWindow, getEspnGames } from "@/lib/espn-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const configured = await isApiConfigured();
    if (configured) {
      const liveMatches = await getLiveMatches();

      if (liveMatches.length > 0) {
        const liveScores = liveMatches.map(convertToLiveScore);
        return NextResponse.json({
          matches: liveScores,
          source: "live",
          provider: "football-data.org",
          apiConfigured: true,
          count: liveScores.length,
        });
      }
    }

    // ESPN provides a no-key live scoreboard, so use it before showing demos.
    try {
      const { dateFrom, dateTo } = getEspnDateWindow(7);
      const espnMatches = await getEspnGames({ dateFrom, dateTo, status: "live", limit: 100 });
      const liveScores = espnMatches.map(convertToLiveScore);
      return NextResponse.json({
        matches: liveScores,
        source: "espn",
        provider: "ESPN",
        apiConfigured: configured,
        count: liveScores.length,
      });
    } catch (espnError) {
      console.warn("[live-scores] ESPN fallback unavailable:", espnError);
    }

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
