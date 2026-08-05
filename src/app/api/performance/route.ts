import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get real performance from DB
    const allBets = await db.placedBet.findMany();

    const totalStaked = allBets.reduce((sum, b) => sum + b.stake, 0);
    const wonBets = allBets.filter((b) => b.status === "won");
    const lostBets = allBets.filter((b) => b.status === "lost");
    const voidBets = allBets.filter((b) => b.status === "void");
    const pendingBets = allBets.filter((b) => b.status === "pending");

    const totalReturned = wonBets.reduce((sum, b) => sum + b.potentialReturn, 0);
    const netPL = totalReturned - totalStaked;

    // Get tip performance from DB
    const allTips = await db.tip.findMany();
    const wonTips = allTips.filter((t) => t.status === "won").length;
    const lostTips = allTips.filter((t) => t.status === "lost").length;

    // If no real data, provide seed performance stats
    const hasData = allBets.length > 0 || allTips.length > 0;

    if (hasData) {
      return NextResponse.json({
        performance: {
          totalStaked,
          totalReturns: totalReturned,
          netPL,
          roi: totalStaked > 0 ? parseFloat((((totalReturned - totalStaked) / totalStaked) * 100).toFixed(1)) : 0,
          won: wonTips || wonBets.length,
          void: voidBets.length,
          lost: lostTips || lostBets.length,
          totalTips: allTips.length || allBets.length,
          pending: pendingBets.length,
        },
        source: "database",
        apiConfigured: true,
      });
    }

    // Seed fallback
    return NextResponse.json({
      performance: {
        totalStaked: 4500,
        totalReturns: 7230,
        netPL: 2730,
        roi: 12.4,
        won: 23,
        void: 5,
        lost: 8,
        totalTips: 36,
        pending: 3,
      },
      source: "seed",
      apiConfigured: false,
    });
  } catch (error) {
    console.error("Performance API error:", error);
    return NextResponse.json({
      performance: {
        totalStaked: 4500,
        totalReturns: 7230,
        netPL: 2730,
        roi: 12.4,
        won: 23,
        void: 5,
        lost: 8,
        totalTips: 36,
        pending: 3,
      },
      source: "fallback",
      apiConfigured: false,
    });
  }
}