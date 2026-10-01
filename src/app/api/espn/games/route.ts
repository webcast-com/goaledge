import { NextRequest, NextResponse } from "next/server";
import { getEspnGames, getEspnLeague } from "@/lib/espn-api";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set(["all", "upcoming", "live", "finished"]);

/**
 * GET /api/espn/games?league=PL&date=2026-10-01&status=all
 *
 * `league` may be a GoalEdge code (PL) or ESPN slug (eng.1). Instead of `date`,
 * callers may use the inclusive `dateFrom` and `dateTo` range parameters.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leagueParam = searchParams.get("league")?.trim() || "";
  const date = searchParams.get("date") || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  const status = (searchParams.get("status") || "all").toLowerCase();
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 100;

  if (leagueParam && leagueParam.toLowerCase() !== "all" && !getEspnLeague(leagueParam)) {
    return NextResponse.json(
      { error: `Unsupported ESPN league: ${leagueParam}`, supported: "GET /api/espn/leagues" },
      { status: 400 },
    );
  }
  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json(
      { error: "status must be one of: all, upcoming, live, finished" },
      { status: 400 },
    );
  }
  if (limitParam && (!Number.isInteger(limit) || limit < 1 || limit > 100)) {
    return NextResponse.json({ error: "limit must be an integer from 1 to 100" }, { status: 400 });
  }
  if (Boolean(dateFrom) !== Boolean(dateTo)) {
    return NextResponse.json(
      { error: "dateFrom and dateTo must be supplied together" },
      { status: 400 },
    );
  }
  if (date && (dateFrom || dateTo)) {
    return NextResponse.json(
      { error: "Use either date or dateFrom/dateTo, not both" },
      { status: 400 },
    );
  }

  try {
    const games = await getEspnGames({
      league: leagueParam && leagueParam.toLowerCase() !== "all" ? leagueParam : undefined,
      date,
      dateFrom,
      dateTo,
      status: status as "all" | "upcoming" | "live" | "finished",
      limit,
    });

    return NextResponse.json({
      games,
      source: "espn",
      provider: "ESPN",
      count: games.length,
      filters: {
        league: leagueParam || "all",
        date: date ?? null,
        dateFrom: dateFrom ?? null,
        dateTo: dateTo ?? null,
        status,
      },
    });
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("ESPN games API error:", error);
    return NextResponse.json({ error: "ESPN scoreboard is unavailable" }, { status: 502 });
  }
}
