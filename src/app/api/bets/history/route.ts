import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRequestEmail } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // A verified session wins over the ?email= query string.
    const email = await resolveRequestEmail(request, searchParams.get("email"));
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { email };
    if (status && status !== "all") {
      where.status = status;
    }

    const [bets, total] = await Promise.all([
      db.orm.PlacedBet.where(where)
        .orderBy((b) => b.createdAt.desc())
        .limit(Math.min(limit, 100))
        .offset(offset)
        .all(),
      db.orm.PlacedBet.where(where)
        .aggregate((a) => ({ n: a.count() }))
        .then((r) => r.n),
    ]);

    // Calculate summary stats
    const allUserBets = await db.orm.PlacedBet.where({ email }).all();
    const totalStaked = allUserBets.reduce((sum, b) => sum + b.stake, 0);
    const wonBets = allUserBets.filter((b) => b.status === "won");
    const totalReturned = wonBets.reduce((sum, b) => sum + b.potentialReturn, 0);
    const profit = totalReturned - totalStaked;

    const formattedBets = bets.map((bet) => ({
      id: bet.id,
      email: bet.email,
      betType: bet.betType,
      legs: JSON.parse(bet.legs),
      stake: bet.stake,
      totalOdds: bet.totalOdds,
      potentialReturn: bet.potentialReturn,
      status: bet.status,
      result: bet.result ? JSON.parse(bet.result) : null,
      settledAt: bet.settledAt,
      createdAt: bet.createdAt,
      updatedAt: bet.updatedAt,
    }));

    return NextResponse.json({
      bets: formattedBets,
      total,
      summary: {
        totalBets: allUserBets.length,
        pendingBets: allUserBets.filter((b) => b.status === "pending").length,
        wonBets: wonBets.length,
        lostBets: allUserBets.filter((b) => b.status === "lost").length,
        voidBets: allUserBets.filter((b) => b.status === "void").length,
        winRate: allUserBets.length > 0
          ? ((wonBets.length / allUserBets.length) * 100).toFixed(1)
          : "0.0",
        totalStaked,
        totalReturned,
        profit,
        roi: totalStaked > 0 ? (((totalReturned - totalStaked) / totalStaked) * 100).toFixed(1) : "0.0",
      },
    });
  } catch (error) {
    console.error("Bet history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}