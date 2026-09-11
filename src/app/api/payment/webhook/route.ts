import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Verify the Paystack signature when a secret key is configured.
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (paystackSecret) {
      const hash = crypto
        .createHmac("sha512", paystackSecret)
        .update(body)
        .digest("hex");
      const paystackSignature = request.headers.get("x-paystack-signature");
      if (!paystackSignature || hash !== paystackSignature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else {
      console.warn("[webhook] PAYSTACK_SECRET_KEY not set — accepting webhook without signature verification (demo mode)");
    }

    const event = JSON.parse(body);

    // Handle charge.success event
    if (event.event === "charge.success") {
      const data = event.data;
      const reference = data.reference;

      const payment = await db.orm.Payment.where({ reference }).first();

      if (payment && payment.status === "pending") {
        const now = new Date();

        await db.orm.Payment.where({ reference }).update({
          status: "completed",
          paidAt: new Date(data.paid_at),
          channel: data.channel,
          updatedAt: now,
        });

        // Upgrade user to premium
        if (payment.userId) {
          await db.orm.User.where({ id: payment.userId }).update({
            plan: "premium",
            updatedAt: now,
          });
        } else {
          const user = await db.orm.User.where({ email: payment.email }).first();
          if (user) {
            await db.orm.User.where({ id: user.id }).update({
              plan: "premium",
              updatedAt: now,
            });
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
      }
    }

    // Handle charge.failed event
    if (event.event === "charge.failed") {
      const reference = event.data.reference;
      await db.orm.Payment.where({ reference })
        .update({ status: "failed", updatedAt: new Date() })
        .catch(() => {});
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}