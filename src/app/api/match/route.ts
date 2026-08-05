import { NextRequest, NextResponse } from "next/server";
import {
  isApiConfigured,
  getMatchById,
  getTeamForm,
  getHeadToHead,
} from "@/lib/football-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = parseInt(searchParams.get("id") || "0");
    const configured = await isApiConfigured();

    if (!matchId || !configured) {
      return NextResponse.json({
        error: "Match ID required and API must be configured",
        apiConfigured: configured,
      }, { status: 400 });
    }

    const match = await getMatchById(matchId);
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Fetch head-to-head and form data for analysis
    const [homeForm, awayForm] = await Promise.all([
      match.id ? getTeamForm(match.id) : Promise.resolve([]),
      match.id ? getTeamForm(match.id) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      match,
      homeForm,
      awayForm,
      apiConfigured: true,
      source: "live",
    });
  } catch (error) {
    console.error("Match API error:", error);
    return NextResponse.json({ error: "Failed to fetch match" }, { status: 500 });
  }
}