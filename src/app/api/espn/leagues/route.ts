import { NextResponse } from "next/server";
import { getEspnLeagues } from "@/lib/espn-api";

export const dynamic = "force-dynamic";

/** GET /api/espn/leagues — league codes and ESPN slugs accepted by /api/espn/games. */
export async function GET() {
  const leagues = getEspnLeagues();
  return NextResponse.json({
    leagues,
    source: "espn",
    provider: "ESPN",
    count: leagues.length,
  });
}
