import { NextResponse } from "next/server";
import { isApiConfigured, getCompetitions } from "@/lib/football-api";

export const dynamic = "force-dynamic";

const SEED_LEAGUES = [
  { code: "PL", name: "Premier League", country: "England", flag: "🦁", emblem: "" },
  { code: "PD", name: "La Liga", country: "Spain", flag: "🇪🇸", emblem: "" },
  { code: "BL1", name: "Bundesliga", country: "Germany", flag: "🇩🇪", emblem: "" },
  { code: "SA", name: "Serie A", country: "Italy", flag: "🇮🇹", emblem: "" },
  { code: "FL1", name: "Ligue 1", country: "France", flag: "🇫🇷", emblem: "" },
  { code: "CL", name: "UEFA Champions League", country: "Europe", flag: "🏆", emblem: "" },
];

export async function GET() {
  try {
    if (await isApiConfigured()) {
      const competitions = await getCompetitions();
      if (competitions.length > 0) {
        const flagMap: Record<string, string> = {
          PL: "🦁", PD: "🇪🇸", BL1: "🇩🇪", SA: "🇮🇹", FL1: "🇫🇷",
          CL: "🏆", EL: "🇪🇺", EC: "🌍", WC: "🌎", PPL: "🇵🇹",
          DED: "🇳🇱", BSA: "🇧🇷", RSA: "🇿🇦",
        };

        return NextResponse.json({
          leagues: competitions.map((c) => ({
            code: c.code,
            name: c.name,
            country: c.country,
            flag: flagMap[c.code] || "⚽",
            emblem: c.emblem,
          })),
          source: "live",
          apiConfigured: true,
        });
      }
    }

    return NextResponse.json({
      leagues: SEED_LEAGUES,
      source: "seed",
      apiConfigured: await isApiConfigured(),
    });
  } catch (error) {
    console.error("Leagues API error:", error);
    return NextResponse.json({
      leagues: SEED_LEAGUES,
      source: "fallback",
      apiConfigured: false,
    });
  }
}