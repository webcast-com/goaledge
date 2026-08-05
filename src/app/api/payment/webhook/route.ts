import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // In production, verify Paystack signature:
    // const paystackSecret = process.env.PAYSTACK_SECRET_KEY!;
    // const hash = crypto.createHmac("sha512", paystackSecret).update(body).digest("hex");
    // const paystackSignature = request.headers.get("x-paystack-signature");
    // if (hash !== paystackSignature) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    const event = JSON.parse(body);

    // Handle charge.success event
    if (event.event === "charge.success") {
      const data = event.data;
      const reference = data.reference;

      const payment = await db.payment.findUnique({
        where: { reference },
      });

      if (payment && payment.status === "pending") {
        const now = new Date();

        await db.payment.update({
          where: { reference },
          data: {
            status: "completed",
            paidAt: new Date(data.paid_at),
            channel: data.channel,
            updatedAt: now,
          },
        });

        // Upgrade user to premium
        if (payment.userId) {
          await db.user.update({
            where: { id: payment.userId },
            data: { plan: "premium", updatedAt: now },
          });
        } else {
          const user = await db.user.findUnique({ where: { email: payment.email } });
          if (user) {
            await db.user.update({
              where: { id: user.id },
              data: { plan: "premium", updatedAt: now },
            });
            await db.payment.update({
              where: { reference },
              data: { userId: user.id },
            });
          }
        }
      }
    }

    // Handle charge.failed event
    if (event.event === "charge.failed") {
      const reference = event.data.reference;
      await db.payment.update({
        where: { reference },
        data: { status: "failed", updatedAt: new Date() },
      }).catch(() => {});
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}