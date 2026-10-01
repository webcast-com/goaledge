import { NextRequest, NextResponse } from "next/server";
import {
  isApiConfigured,
  getAllUpcomingMatches,
  getUpcomingMatches,
  getFinishedMatches,
  getLiveMatches,
  getSeedTips,
  getUpstreamNote,
  type FootballMatch,
} from "@/lib/football-api";
import {
  getEspnGames,
  getEspnUpcomingGames,
  type EspnGameFilter,
} from "@/lib/espn-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const league = searchParams.get("league") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const requestedStatus = searchParams.get("status")?.toLowerCase();
    if (Boolean(dateFrom) !== Boolean(dateTo)) {
      return NextResponse.json(
        { error: "dateFrom and dateTo must be supplied together" },
        { status: 400 },
      );
    }
    const status = getStatusFilter(requestedStatus, Boolean(dateFrom && dateTo));
    const apiConfigured = await isApiConfigured();

    if (apiConfigured) {
      let matches: FootballMatch[] = [];

      if (status === "live") {
        matches = await getLiveMatches();
      } else if (status === "finished") {
        matches = await getFinishedMatches(dateFrom || undefined, dateTo || undefined);
      } else if (league) {
        matches = await getUpcomingMatches(league, 20);
      } else {
        matches = await getAllUpcomingMatches(10);
      }

      if (league && (status === "live" || status === "finished")) {
        matches = matches.filter((match) => match.competitionCode === league);
      }

      if (matches.length > 0) {
        const fixtures = matches.map(toFixture);
        return NextResponse.json({
          fixtures,
          source: "live",
          provider: "football-data.org",
          apiConfigured: true,
          count: fixtures.length,
        });
      }
    }

    // ESPN's public soccer scoreboards need no API key. Use them whenever the
    // configured football-data.org provider is unavailable or has no matches.
    try {
      const espnMatches =
        status === "upcoming" && !dateFrom
          ? await getEspnUpcomingGames({ league: league || undefined, limit: league ? 20 : 100 })
          : await getEspnGames({
              league: league || undefined,
              dateFrom: dateFrom || undefined,
              dateTo: dateTo || undefined,
              status,
              limit: league ? 20 : 100,
            });
      const fixtures = espnMatches.map(toFixture);
      return NextResponse.json({
        fixtures,
        source: "espn",
        provider: "ESPN",
        apiConfigured,
        count: fixtures.length,
      });
    } catch (espnError) {
      console.warn("[fixtures] ESPN fallback unavailable:", espnError);
    }

    const seedTips = getSeedTips();
    return NextResponse.json({
      fixtures: seedTips.map((tip) => ({
        id: tip.id,
        utcDate: "",
        status: "SCHEDULED",
        matchday: 0,
        homeTeam: tip.homeTeam,
        awayTeam: tip.awayTeam,
        homeTeamCrest: tip.homeTeamCrest,
        awayTeamCrest: tip.awayTeamCrest,
        homeScore: null,
        awayScore: null,
        competition: tip.league,
        competitionEmblem: "",
        competitionCode: tip.competitionCode,
      })),
      source: "seed",
      apiConfigured,
      count: seedTips.length,
      note: getUpstreamNote(),
    });
  } catch (error) {
    console.error("Fixtures API error:", error);
    return NextResponse.json({ error: "Failed to fetch fixtures" }, { status: 500 });
  }
}

function getStatusFilter(status: string | undefined, hasDateRange: boolean): EspnGameFilter {
  if (!status) return hasDateRange ? "finished" : "upcoming";
  if (["live", "in_play", "in-play", "paused"].includes(status)) return "live";
  if (["finished", "final", "completed"].includes(status)) return "finished";
  if (status === "all") return "all";
  return "upcoming";
}

function toFixture(match: FootballMatch) {
  return {
    id: match.id,
    utcDate: match.utcDate,
    status: match.status,
    matchday: match.matchday,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeTeamCrest: match.homeTeamCrest,
    awayTeamCrest: match.awayTeamCrest,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    competition: match.competition,
    competitionEmblem: match.competitionEmblem,
    competitionCode: match.competitionCode,
    minute: match.minute,
  };
}
