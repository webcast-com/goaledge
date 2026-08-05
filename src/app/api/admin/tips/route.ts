import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { settleBetsForTip, isSettledStatus } from "@/lib/bet-settlement";

// ─── Historical seed data for tip history ────────────────────────────────────
function getHistoricalSeedTips() {
  return [
    {
      league: "Premier League",
      country: "England",
      flag: "🦁",
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      matchTime: "10 Jul, 15:00",
      predictionType: "Match Result",
      prediction: "Arsenal to Win",
      odds: "1.85",
      confidence: 82,
      confidenceLabel: "High",
      status: "won",
      tipster: "Arena Tipster",
      isPremium: false,
      analysis:
        "Arsenal have won 8 of their last 10 home matches against Chelsea. Strong form and key player availability.",
    },
    {
      league: "La Liga",
      country: "Spain",
      flag: "🇪🇸",
      homeTeam: "Barcelona",
      awayTeam: "Atletico Madrid",
      matchTime: "09 Jul, 20:00",
      predictionType: "Over/Under",
      prediction: "Over 2.5 Goals",
      odds: "1.70",
      confidence: 76,
      confidenceLabel: "High",
      status: "won",
      tipster: "Data Analyst",
      isPremium: true,
      analysis:
        "Both teams have high-scoring records. Last 5 meetings averaged 3.4 goals.",
    },
    {
      league: "Serie A",
      country: "Italy",
      flag: "🇮🇹",
      homeTeam: "AC Milan",
      awayTeam: "Napoli",
      matchTime: "08 Jul, 18:30",
      predictionType: "Both Teams to Score",
      prediction: "Both Teams to Score - Yes",
      odds: "1.90",
      confidence: 72,
      confidenceLabel: "Medium",
      status: "lost",
      tipster: "Arena Tipster",
      isPremium: false,
      analysis:
        "Napoli kept a clean sheet in this match. Our BTTS analysis missed their recent defensive improvements.",
    },
    {
      league: "Bundesliga",
      country: "Germany",
      flag: "🇩🇪",
      homeTeam: "Bayern Munich",
      awayTeam: "RB Leipzig",
      matchTime: "07 Jul, 14:30",
      predictionType: "Match Result",
      prediction: "Bayern Munich to Win",
      odds: "1.50",
      confidence: 88,
      confidenceLabel: "Very High",
      status: "won",
      tipster: "Arena Tipster",
      isPremium: true,
      analysis:
        "Bayern have a 90% home win rate this season. Leipzig missing 3 key starters.",
    },
    {
      league: "Ligue 1",
      country: "France",
      flag: "🇫🇷",
      homeTeam: "PSG",
      awayTeam: "Marseille",
      matchTime: "06 Jul, 21:00",
      predictionType: "Handicap",
      prediction: "PSG -1.5 Handicap",
      odds: "2.10",
      confidence: 68,
      confidenceLabel: "Medium",
      status: "lost",
      tipster: "Data Analyst",
      isPremium: true,
      analysis:
        "PSG won but only by 1 goal. The handicap was too ambitious for this fixture.",
    },
    {
      league: "NPFL",
      country: "Nigeria",
      flag: "🇳🇬",
      homeTeam: "Enyimba",
      awayTeam: "Rangers Intl",
      matchTime: "05 Jul, 15:00",
      predictionType: "Double Chance",
      prediction: "Double Chance - Home/Draw",
      odds: "1.35",
      confidence: 85,
      confidenceLabel: "Very High",
      status: "won",
      tipster: "Local Expert",
      isPremium: false,
      analysis:
        "Enyimba undefeated at home this season. Strong defensive record makes this a safe pick.",
    },
    {
      league: "Premier League",
      country: "England",
      flag: "🦁",
      homeTeam: "Liverpool",
      awayTeam: "Man City",
      matchTime: "04 Jul, 16:30",
      predictionType: "Match Result",
      prediction: "Liverpool to Win",
      odds: "2.25",
      confidence: 65,
      confidenceLabel: "Medium",
      status: "void",
      tipster: "Arena Tipster",
      isPremium: true,
      analysis:
        "Match was postponed due to weather conditions. Bet voided and stakes returned.",
    },
    {
      league: "La Liga",
      country: "Spain",
      flag: "🇪🇸",
      homeTeam: "Real Madrid",
      awayTeam: "Real Sociedad",
      matchTime: "03 Jul, 19:00",
      predictionType: "Over/Under",
      prediction: "Under 3.5 Goals",
      odds: "1.65",
      confidence: 79,
      confidenceLabel: "High",
      status: "won",
      tipster: "Data Analyst",
      isPremium: false,
      analysis:
        "Real Sociedad's defensive setup limited Madrid to 2 goals. Solid under pick.",
    },
    {
      league: "Serie A",
      country: "Italy",
      flag: "🇮🇹",
      homeTeam: "Inter Milan",
      awayTeam: "Roma",
      matchTime: "02 Jul, 20:45",
      predictionType: "Match Result",
      prediction: "Inter Milan to Win",
      odds: "1.55",
      confidence: 84,
      confidenceLabel: "Very High",
      status: "won",
      tipster: "Arena Tipster",
      isPremium: false,
      analysis:
        "Inter's home dominance continues. Roma struggling with away form all season.",
    },
    {
      league: "Bundesliga",
      country: "Germany",
      flag: "🇩🇪",
      homeTeam: "Dortmund",
      awayTeam: "Leverkusen",
      matchTime: "01 Jul, 17:30",
      predictionType: "Both Teams to Score",
      prediction: "Both Teams to Score - Yes",
      odds: "1.55",
      confidence: 81,
      confidenceLabel: "High",
      status: "won",
      tipster: "Data Analyst",
      isPremium: true,
      analysis:
        "Both teams have scored in 9 of their last 10 encounters. High-scoring affair expected.",
    },
  ];
}

async function seedHistoricalTips() {
  const existingHistory = await db.tip.count({
    where: { status: { in: ["won", "lost", "void"] } },
  });

  if (existingHistory === 0) {
    const historicalTips = getHistoricalSeedTips();
    await db.tip.createMany({ data: historicalTips });
    return historicalTips;
  }

  return null;
}

// ─── GET: List tips with optional filters ─────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const league = searchParams.get("league");
    const isPremium = searchParams.get("isPremium");
    const history = searchParams.get("history");

    // If history=true, ensure historical tips exist and return them
    if (history === "true") {
      const seeded = await seedHistoricalTips();
      const historyTips = await db.tip.findMany({
        where: { status: { in: ["won", "lost", "void"] } },
        orderBy: { matchTime: "desc" },
      });
      return NextResponse.json({ tips: historyTips });
    }

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (league) {
      where.league = league;
    }

    if (isPremium !== null && isPremium !== undefined && isPremium !== "") {
      where.isPremium = isPremium === "true";
    }

    const tips = await db.tip.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tips });
  } catch (error) {
    console.error("Error fetching tips:", error);
    return NextResponse.json(
      { error: "Failed to fetch tips" },
      { status: 500 }
    );
  }
}

// ─── POST: Create a new tip ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      league,
      country,
      flag,
      homeTeam,
      awayTeam,
      matchTime,
      predictionType,
      prediction,
      odds,
      confidence,
      confidenceLabel,
      tipster,
      isPremium,
      analysis,
    } = body;

    // Validate required fields
    const requiredFields = [
      "league",
      "country",
      "homeTeam",
      "awayTeam",
      "matchTime",
      "predictionType",
      "prediction",
      "odds",
      "confidence",
      "confidenceLabel",
      "tipster",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate confidence is a number between 0 and 100
    const confidenceNum = Number(confidence);
    if (
      isNaN(confidenceNum) ||
      confidenceNum < 0 ||
      confidenceNum > 100
    ) {
      return NextResponse.json(
        { error: "Confidence must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    // Validate odds format (should be a valid decimal string)
    const oddsNum = Number(odds);
    if (isNaN(oddsNum) || oddsNum <= 1) {
      return NextResponse.json(
        { error: "Odds must be a valid decimal number greater than 1" },
        { status: 400 }
      );
    }

    const tip = await db.tip.create({
      data: {
        league,
        country,
        flag: flag || "⚽",
        homeTeam,
        awayTeam,
        matchTime,
        predictionType,
        prediction,
        odds: String(odds),
        confidence: confidenceNum,
        confidenceLabel,
        tipster,
        isPremium: Boolean(isPremium),
        analysis: analysis || null,
      },
    });

    return NextResponse.json({ tip }, { status: 201 });
  } catch (error) {
    console.error("Error creating tip:", error);
    return NextResponse.json(
      { error: "Failed to create tip" },
      { status: 500 }
    );
  }
}

// ─── PATCH: Update a tip ─────────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Tip id is required" },
        { status: 400 }
      );
    }

    // Validate confidence if provided
    if (updateData.confidence !== undefined) {
      const confidenceNum = Number(updateData.confidence);
      if (
        isNaN(confidenceNum) ||
        confidenceNum < 0 ||
        confidenceNum > 100
      ) {
        return NextResponse.json(
          { error: "Confidence must be a number between 0 and 100" },
          { status: 400 }
        );
      }
      updateData.confidence = confidenceNum;
    }

    // Check if tip exists
    const existing = await db.tip.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Tip not found" },
        { status: 404 }
      );
    }

    const tip = await db.tip.update({
      where: { id },
      data: updateData,
    });

    // When a tip is settled, auto-resolve every pending bet that includes it.
    if (updateData.status && isSettledStatus(updateData.status)) {
      try {
        await settleBetsForTip(db, id);
      } catch (error) {
        console.error("Error settling bets for tip:", error);
      }
    }

    return NextResponse.json({ tip });
  } catch (error) {
    console.error("Error updating tip:", error);
    return NextResponse.json(
      { error: "Failed to update tip" },
      { status: 500 }
    );
  }
}

// ─── DELETE: Delete a tip ────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Tip id is required" },
        { status: 400 }
      );
    }

    // Check if tip exists
    const existing = await db.tip.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Tip not found" },
        { status: 404 }
      );
    }

    await db.tip.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Tip deleted" });
  } catch (error) {
    console.error("Error deleting tip:", error);
    return NextResponse.json(
      { error: "Failed to delete tip" },
      { status: 500 }
    );
  }
}