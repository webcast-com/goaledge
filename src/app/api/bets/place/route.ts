import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newId } from "@/lib/ids";
import { resolveRequestEmail } from "@/lib/auth";
import { settleBet } from "@/lib/bet-settlement";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

interface BetLeg {
  tipId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  prediction: string;
  predictionType: string;
  odds: string;
  matchTime: string;
}

export async function POST(request: NextRequest) {
  // Rate limit: max 30 bets per IP per minute
  const rl = rateLimit(`bets:${getClientIp(request)}`, 30);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  try {
    const body = await request.json();
    const { email: bodyEmail, betType, legs, stake, totalOdds, potentialReturn } = body as {
      email: string;
      betType: string;
      legs: BetLeg[];
      stake: number;
      totalOdds: number;
      potentialReturn: number;
    };

    // A verified session wins over the email in the body.
    const email = await resolveRequestEmail(request, bodyEmail);

    // Validate
    if (!email || !betType || !legs || legs.length === 0 || !stake || stake <= 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (legs.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 legs per bet" },
        { status: 400 }
      );
    }

    if (stake < 10) {
      return NextResponse.json(
        { error: "Minimum stake is Ksh 10" },
        { status: 400 }
      );
    }

    if (stake > 500000) {
      return NextResponse.json(
        { error: "Maximum stake is Ksh 500,000" },
        { status: 400 }
      );
    }

    const validTypes = ["single", "double", "treble", "4fold", "5fold", "6fold", "acca"];
    if (!validTypes.includes(betType)) {
      return NextResponse.json(
        { error: "Invalid bet type" },
        { status: 400 }
      );
    }

    // Validate bet type matches leg count
    const expectedLegs: Record<string, number | null> = {
      single: 1,
      double: 2,
      treble: 3,
      "4fold": 4,
      "5fold": 5,
      "6fold": 6,
      acca: null, // any number
    };
    const expected = expectedLegs[betType];
    if (expected !== null && legs.length !== expected) {
      return NextResponse.json(
        { error: `${betType} requires exactly ${expected} leg(s)` },
        { status: 400 }
      );
    }

    // Validate each leg
    for (const leg of legs) {
      if (!leg.tipId || !leg.homeTeam || !leg.awayTeam || !leg.prediction || !leg.odds) {
        return NextResponse.json(
          { error: "Each leg must have tipId, homeTeam, awayTeam, prediction, and odds" },
          { status: 400 }
        );
      }
      const oddsNum = parseFloat(leg.odds);
      if (isNaN(oddsNum) || oddsNum < 1.01) {
        return NextResponse.json(
          { error: `Invalid odds for ${leg.homeTeam} vs ${leg.awayTeam}` },
          { status: 400 }
        );
      }
    }

    // Verify odds calculation
    const computedOdds = legs.reduce((acc, leg) => acc * parseFloat(leg.odds), 1);
    const computedReturn = Math.round(stake * computedOdds);

    // Allow small rounding differences
    if (Math.abs(computedOdds - totalOdds) > 0.01) {
      return NextResponse.json(
        { error: "Odds mismatch — tampering detected" },
        { status: 400 }
      );
    }

    // Create the bet
    const bet = await db.orm.PlacedBet.create({
      id: newId(),
      email,
      betType,
      legs: JSON.stringify(legs),
      stake,
      totalOdds: Math.round(computedOdds * 100) / 100,
      potentialReturn: computedReturn,
      status: "pending",
    });

    // Initialize per-leg results as pending
    const legResults = legs.map((leg) => ({
      tipId: leg.tipId,
      result: "pending" as const,
    }));

    await db.orm.PlacedBet.where({ id: bet.id }).update({
      result: JSON.stringify(legResults),
    });

    // If any leg is already settled (won/lost/void), resolve the bet immediately.
    try {
      await settleBet(db, bet.id);
    } catch (error) {
      console.error("Error settling bet at placement:", error);
    }

    const settled = await db.orm.PlacedBet.first({ id: bet.id });

    return NextResponse.json({
      success: true,
      bet: {
        id: settled!.id,
        email: settled!.email,
        betType: settled!.betType,
        legs: JSON.parse(settled!.legs),
        stake: settled!.stake,
        totalOdds: settled!.totalOdds,
        potentialReturn: settled!.potentialReturn,
        status: settled!.status,
        result: settled!.result ? JSON.parse(settled!.result) : null,
        settledAt: settled!.settledAt,
        createdAt: settled!.createdAt,
      },
    });
  } catch (error) {
    console.error("Place bet error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}