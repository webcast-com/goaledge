import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Plan pricing in Ksh
const PLAN_PRICES: Record<string, number> = {
  daily: 100,
  weekly: 500,
  monthly: 1500,
};

export async function POST(request: NextRequest) {
  // Rate limit: max 10 payment initiations per IP per minute
  const rl = rateLimit(`payment:${getClientIp(request)}`, 10);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  try {
    const body = await request.json();
    const { email, amount, plan } = body;

    // Validate required fields
    if (!email || !amount || !plan) {
      return NextResponse.json(
        { error: "Missing required fields: email, amount, plan" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate plan
    if (!["daily", "weekly", "monthly"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan. Choose: daily, weekly, monthly" },
        { status: 400 }
      );
    }

    // Validate amount matches plan
    const expectedAmount = PLAN_PRICES[plan];
    const amountNum = Number(amount);
    if (amountNum !== expectedAmount) {
      return NextResponse.json(
        { error: `Amount must be Ksh ${expectedAmount} for ${plan} plan` },
        { status: 400 }
      );
    }

    const reference = `GE_${Date.now()}_${randomUUID().replace(/-/g, "").slice(0, 8)}`;
    let accessCode = randomUUID().replace(/-/g, "").slice(0, 20);
    let authorizationUrl = `https://checkout.paystack.com/${accessCode}?ref=${reference}`;
    let mode: "live" | "demo" = "demo";

    // Real Paystack integration — used when PAYSTACK_SECRET_KEY is configured.
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (paystackSecret) {
      try {
        const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            amount: amountNum * 100, // Paystack expects amount in cents (KES)
            currency: "KES",
            reference,
            metadata: {
              plan,
              custom_fields: [
                { display_name: "Plan", variable_name: "plan", value: plan },
              ],
            },
          }),
          signal: AbortSignal.timeout(15000),
        });
        const paystackData = await paystackRes.json();
        if (!paystackRes.ok || !paystackData.status || !paystackData.data?.authorization_url) {
          return NextResponse.json(
            { error: paystackData.message || "Paystack initialization failed" },
            { status: 502 }
          );
        }
        authorizationUrl = paystackData.data.authorization_url;
        accessCode = paystackData.data.access_code || accessCode;
        mode = "live";
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Paystack unreachable";
        console.error("Paystack initialize error:", msg);
        return NextResponse.json(
          { error: `Paystack connection failed: ${msg}` },
          { status: 502 }
        );
      }
    }

    // Calculate expiry
    const now = new Date();
    const expiresAt = new Date();
    if (plan === "daily") expiresAt.setHours(expiresAt.getHours() + 24);
    else if (plan === "weekly") expiresAt.setDate(expiresAt.getDate() + 7);
    else expiresAt.setDate(expiresAt.getDate() + 30);

    // Store payment in DB
    await db.payment.create({
      data: {
        email,
        amount: amountNum,
        plan,
        reference,
        accessCode,
        status: "pending",
        expiresAt,
        metadata: JSON.stringify({ initiatedAt: now.toISOString() }),
      },
    });

    return NextResponse.json({
      authorization_url: authorizationUrl,
      access_code: accessCode,
      reference,
      mode,
    });
  } catch (error) {
    console.error("Error initiating payment:", error);
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    );
  }
}