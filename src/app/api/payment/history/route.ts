import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRequestEmail } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // A verified session wins over the ?email= query string.
    const email = await resolveRequestEmail(request, searchParams.get("email"));

    if (!email) {
      return NextResponse.json(
        { error: "Missing email parameter" },
        { status: 400 }
      );
    }

    const payments = await db.orm.Payment.where({ email })
      .orderBy((pay) => pay.createdAt.desc())
      .limit(20)
      .all();

    // Summary stats
    const totalSpent = payments
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + p.amount, 0);

    const completedCount = payments.filter((p) => p.status === "completed").length;

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        reference: p.reference,
        amount: p.amount,
        plan: p.plan,
        status: p.status,
        channel: p.channel,
        paidAt: p.paidAt?.toISOString(),
        expiresAt: p.expiresAt?.toISOString(),
        createdAt: p.createdAt.toISOString(),
      })),
      summary: {
        totalPayments: payments.length,
        completedPayments: completedCount,
        totalSpent,
        currency: "KES",
      },
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment history" },
      { status: 500 }
    );
  }
}