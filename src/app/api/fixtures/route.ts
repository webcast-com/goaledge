import { NextRequest, NextResponse } from "next/server";
import {
  isApiConfigured,
  getAllUpcomingMatches,
  getUpcomingMatches,
  getFinishedMatches,
  generateTipsFromMatches,
  getSeedTips,
} from "@/lib/football-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const league = searchParams.get("league") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const status = searchParams.get("status") || "SCHEDULED";

    if (await isApiConfigured()) {
      let matches;

      if (league) {
        matches = await getUpcomingMatches(league, 20);
      } else if (dateFrom && dateTo) {
        matches = await getFinishedMatches(dateFrom, dateTo);
      } else {
        matches = await getAllUpcomingMatches(10);
      }

      if (matches && matches.length > 0) {
        const fixtures = matches.map((m) => ({
          id: m.id,
          utcDate: m.utcDate,
          status: m.status,
          matchday: m.matchday,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          homeTeamCrest: m.homeTeamCrest,
          awayTeamCrest: m.awayTeamCrest,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          competition: m.competition,
          competitionEmblem: m.competitionEmblem,
          competitionCode: m.competitionCode,
          minute: m.minute,
        }));

        return NextResponse.json({
          fixtures,
          source: "live",
          apiConfigured: true,
          count: fixtures.length,
        });
      }
    }

    const seedTips = getSeedTips();
    return NextResponse.json({
      fixtures: seedTips.map((t) => ({
        id: t.id,
        utcDate: "",
        status: "SCHEDULED",
        matchday: 0,
        homeTeam: t.homeTeam,
        awayTeam: t.awayTeam,
        homeTeamCrest: t.homeTeamCrest,
        awayTeamCrest: t.awayTeamCrest,
        homeScore: null,
        awayScore: null,
        competition: t.league,
        competitionEmblem: "",
        competitionCode: t.competitionCode,
      })),
      source: "seed",
      apiConfigured: await isApiConfigured(),
      count: seedTips.length,
    });
  } catch (error) {
    console.error("Fixtures API error:", error);
    return NextResponse.json({ error: "Failed to fetch fixtures" }, { status: 500 });
  }
}