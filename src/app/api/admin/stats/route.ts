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
      db.orm.Tip.aggregate((a) => ({ n: a.count() })),
      db.orm.Tip.where({ status: "won" }).aggregate((a) => ({ n: a.count() })),
      db.orm.Tip.where({ status: "lost" }).aggregate((a) => ({ n: a.count() })),
      db.orm.Tip.where({ status: "void" }).aggregate((a) => ({ n: a.count() })),
      db.orm.User.aggregate((a) => ({ n: a.count() })),
      db.orm.User.where({ plan: "premium" }).aggregate((a) => ({ n: a.count() })),
    ]).then((rows) => rows.map((r) => r.n));

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