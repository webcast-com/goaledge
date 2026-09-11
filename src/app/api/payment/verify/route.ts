import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { error: "Missing reference" },
        { status: 400 }
      );
    }

    // Find the payment in DB
    const payment = await db.orm.Payment.where({ reference }).first();

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Real Paystack verification when the secret key is configured.
    let isSuccessful = false;
    let isFailed = false;
    let channel: string | null = null;

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (paystackSecret) {
      try {
        const paystackRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          { headers: { Authorization: `Bearer ${paystackSecret}` }, signal: AbortSignal.timeout(15000) }
        );
        const paystackData = await paystackRes.json();
        if (!paystackRes.ok || !paystackData.status) {
          return NextResponse.json(
            { error: paystackData.message || "Paystack verification failed" },
            { status: 502 }
          );
        }
        const psStatus = paystackData.data?.status;
        if (psStatus === "success") {
          isSuccessful = true;
          channel = paystackData.data.channel || "card";
        } else if (psStatus === "failed" || psStatus === "abandoned") {
          isFailed = true;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Paystack unreachable";
        console.error("Paystack verify error:", msg);
        return NextResponse.json(
          { error: `Paystack connection failed: ${msg}` },
          { status: 502 }
        );
      }
    } else {
      // Demo mode (no PAYSTACK_SECRET_KEY): simulate a successful charge.
      isSuccessful = true;
      channel = "card";
    }

    if (isFailed) {
      await db.orm.Payment.where({ reference }).update({
        status: "failed",
        updatedAt: new Date(),
      });
      return NextResponse.json({ status: "failed", message: "Payment failed" });
    }

    if (isSuccessful && payment.status === "pending") {
      const now = new Date();

      // Update payment status
      await db.orm.Payment.where({ reference }).update({
        status: "completed",
        paidAt: now,
        channel: channel || "card",
        updatedAt: now,
      });

      // Update user plan if user exists
      if (payment.userId) {
        await db.orm.User.where({ id: payment.userId }).update({
          plan: "premium",
          updatedAt: now,
        });
      } else {
        // Try to find user by email
        const user = await db.orm.User.where({ email: payment.email }).first();
        if (user) {
          await db.orm.User.where({ id: user.id }).update({
            plan: "premium",
            updatedAt: now,
          });
          // Link payment to user
          await db.orm.Payment.where({ reference }).update({ userId: user.id });
        }
      }

      // Referral reward: first completed payment by a referred user
      // credits their referrer with free premium days (idempotent).
      try {
        const { rewardReferrerForPayment } = await import("@/lib/referrals");
        const reward = await rewardReferrerForPayment(db, payment.email);
        if (reward.rewarded) {
          console.log(
            `[referral] Referrer rewarded +${reward.rewardDays} days for ${payment.email}`
          );
        }
      } catch (error) {
        console.error("Referral reward error:", error);
      }

      return NextResponse.json({
        status: "success",
        message: "Payment verified and premium activated",
        payment: {
          reference: payment.reference,
          amount: payment.amount,
          plan: payment.plan,
          status: "completed",
          paidAt: now.toISOString(),
          expiresAt: payment.expiresAt?.toISOString(),
        },
      });
    }

    return NextResponse.json({
      status: payment.status,
      message: `Payment is ${payment.status}`,
      payment: {
        reference: payment.reference,
        amount: payment.amount,
        plan: payment.plan,
        status: payment.status,
      },
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}

// GET handler to check payment status without updating
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json(
        { error: "Missing reference parameter" },
        { status: 400 }
      );
    }

    const payment = await db.orm.Payment.where({ reference }).first();

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      reference: payment.reference,
      amount: payment.amount,
      plan: payment.plan,
      status: payment.status,
      paidAt: payment.paidAt?.toISOString(),
      expiresAt: payment.expiresAt?.toISOString(),
      createdAt: payment.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching payment:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment" },
      { status: 500 }
    );
  }
}