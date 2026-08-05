import { NextRequest, NextResponse } from "next/server";
import {
  isApiConfigured,
  getStandings,
  getAllStandings,
} from "@/lib/football-api";

export const dynamic = "force-dynamic";

// Seed fallback standings
const SEED_STANDINGS = {
  PL: [
    { pos: 1, team: "Arsenal", p: 28, w: 20, d: 5, l: 3, gd: "+38", pts: 65, crest: "" },
    { pos: 2, team: "Liverpool", p: 28, w: 19, d: 6, l: 3, gd: "+35", pts: 63, crest: "" },
    { pos: 3, team: "Man City", p: 28, w: 18, d: 5, l: 5, gd: "+30", pts: 59, crest: "" },
    { pos: 4, team: "Aston Villa", p: 28, w: 16, d: 4, l: 8, gd: "+18", pts: 52, crest: "" },
    { pos: 5, team: "Tottenham", p: 28, w: 15, d: 4, l: 9, gd: "+12", pts: 49, crest: "" },
    { pos: 6, team: "Newcastle", p: 28, w: 14, d: 5, l: 9, gd: "+14", pts: 47, crest: "" },
    { pos: 7, team: "Man United", p: 28, w: 12, d: 4, l: 12, gd: "+2", pts: 40, crest: "" },
    { pos: 8, team: "Brighton", p: 28, w: 11, d: 6, l: 11, gd: "-2", pts: 39, crest: "" },
  ],
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const league = searchParams.get("league") || "PL";

    if (await isApiConfigured()) {
      // If a specific league is requested
      if (league !== "all") {
        const data = await getStandings(league);
        if (data) {
          return NextResponse.json({
            standings: data.standings.map((s) => ({
              pos: s.position,
              team: s.team,
              p: s.played,
              w: s.won,
              d: s.draw,
              l: s.lost,
              gd: (s.goalDifference >= 0 ? "+" : "") + s.goalDifference,
              pts: s.points,
              crest: s.crest,
              form: s.form,
            })),
            competition: data.competition,
            emblem: data.emblem,
            source: "live",
            apiConfigured: true,
          });
        }
      }

      // Get all standings
      const allData = await getAllStandings();
      if (allData.length > 0) {
        const combined = allData.map((d) => ({
          league: d.competition,
          emblem: d.emblem,
          standings: d.standings.map((s) => ({
            pos: s.position,
            team: s.team,
            p: s.played,
            w: s.won,
            d: s.draw,
            l: s.lost,
            gd: (s.goalDifference >= 0 ? "+" : "") + s.goalDifference,
            pts: s.points,
            crest: s.crest,
            form: s.form,
          })),
        }));

        return NextResponse.json({
          leagues: combined,
          source: "live",
          apiConfigured: true,
          count: combined.length,
        });
      }
    }

    // Fallback
    if (league !== "all" && SEED_STANDINGS[league as keyof typeof SEED_STANDINGS]) {
      return NextResponse.json({
        standings: SEED_STANDINGS[league as keyof typeof SEED_STANDINGS],
        source: "seed",
        apiConfigured: await isApiConfigured(),
      });
    }

    return NextResponse.json({
      standings: SEED_STANDINGS.PL,
      source: "seed",
      apiConfigured: await isApiConfigured(),
    });
  } catch (error) {
    console.error("Standings API error:", error);
    return NextResponse.json({
      standings: SEED_STANDINGS.PL,
      source: "fallback",
      apiConfigured: false,
    });
  }
}