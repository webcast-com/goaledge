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

    // In production, verify with Paystack:
    // const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    //   headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    // });
    // const paystackData = await paystackRes.json();

    // Find the payment in DB
    const payment = await db.payment.findUnique({
      where: { reference },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Simulate verification: mark as completed after a short delay
    // In production, use paystackData.data.status === "success"
    const isSuccessful = true; // simulated

    if (isSuccessful && payment.status === "pending") {
      const now = new Date();

      // Update payment status
      await db.payment.update({
        where: { reference },
        data: {
          status: "completed",
          paidAt: now,
          channel: "card", // simulated
          updatedAt: now,
        },
      });

      // Update user plan if user exists
      if (payment.userId) {
        await db.user.update({
          where: { id: payment.userId },
          data: {
            plan: "premium",
            updatedAt: now,
          },
        });
      } else {
        // Try to find user by email
        const user = await db.user.findUnique({ where: { email: payment.email } });
        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: {
              plan: "premium",
              updatedAt: now,
            },
          });
          // Link payment to user
          await db.payment.update({
            where: { reference },
            data: { userId: user.id },
          });
        }
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

    const payment = await db.payment.findUnique({
      where: { reference },
    });

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