import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Run all queries in parallel for performance
    const [
      totalTips,
      wonCount,
      lostCount,
      voidCount,
      totalUsers,
      premiumUsers,
    ] = await Promise.all([
      db.tip.count(),
      db.tip.count({ where: { status: "won" } }),
      db.tip.count({ where: { status: "lost" } }),
      db.tip.count({ where: { status: "void" } }),
      db.user.count(),
      db.user.count({ where: { plan: "premium" } }),
    ]);

    // Calculate win rate (excluding void tips from denominator)
    const resolvedTips = wonCount + lostCount;
    const winRate =
      resolvedTips > 0 ? Math.round((wonCount / resolvedTips) * 100) : 0;

    // Revenue estimate: premium users * $100
    const revenueEstimate = premiumUsers * 100;

    return NextResponse.json({
      totalTips,
      won: wonCount,
      lost: lostCount,
      void: voidCount,
      winRate,
      totalUsers,
      premiumUsers,
      revenueEstimate,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}