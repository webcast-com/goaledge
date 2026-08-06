/**
 * Referral program logic
 * ----------------------
 * - Every user gets a unique invite code (6 chars, no ambiguous letters).
 * - Signing up with a code links the new account to the referrer and grants
 *   the new user REFEREE_BONUS_DAYS of free premium.
 * - When the referred user completes their first payment, the referrer earns
 *   REFERRER_REWARD_DAYS of premium (only once per referred user).
 *
 * Rewards are granted as zero-amount "referral" Payment rows, which the
 * existing premium logic (check-premium, Payment.expiresAt) understands.
 */

import type { PrismaClient } from "@prisma/client";

export const REFERRER_REWARD_DAYS = 7;
export const REFEREE_BONUS_DAYS = 2;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1
const CODE_LENGTH = 6;

export function generateReferralCode(): string {
  let code = "";
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function daysFromNow(days: number, base: Date = new Date()): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Grant a free-premium Payment row for a user, extending from their current
 * expiry (so it never shortens an existing subscription).
 */
async function grantPremiumDays(
  db: PrismaClient,
  userId: string,
  email: string,
  days: number,
  plan: string,
  referencePrefix: string
) {
  const active = await db.payment.findFirst({
    where: { userId, status: "completed", expiresAt: { gte: new Date() } },
    orderBy: { expiresAt: "desc" },
  });
  const base = active?.expiresAt ?? new Date();
  const reference = `${referencePrefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

  await db.payment.create({
    data: {
      email,
      userId,
      amount: 0,
      plan, // "referral_reward" | "referral_bonus"
      reference,
      status: "completed",
      channel: "referral",
      paidAt: new Date(),
      expiresAt: daysFromNow(days, base),
    },
  });
}

/**
 * Apply a referral code at signup time.
 * - Links the new user to the referrer (Referral row, status "pending").
 * - Grants the new user REFEREE_BONUS_DAYS of free premium.
 * Returns { applied, referrerName?, bonusDays } — never throws for bad codes.
 */
export async function applyReferralOnSignup(
  db: PrismaClient,
  newUserId: string,
  newUserEmail: string,
  rawCode?: string | null
): Promise<{ applied: boolean; referrerName?: string; bonusDays: number }> {
  const code = rawCode ? normalizeCode(rawCode) : "";
  if (!code) return { applied: false, bonusDays: 0 };

  const referrer = await db.user.findUnique({ where: { referralCode: code } });
  if (!referrer || referrer.id === newUserId) {
    return { applied: false, bonusDays: 0 };
  }

  const existing = await db.referral.findUnique({ where: { referredId: newUserId } });
  if (existing) return { applied: false, bonusDays: 0 };

  await db.referral.create({
    data: {
      code,
      referrerId: referrer.id,
      referredId: newUserId,
      status: "pending",
    },
  });

  try {
    await grantPremiumDays(
      db,
      newUserId,
      newUserEmail,
      REFEREE_BONUS_DAYS,
      "referral_bonus",
      "REFBONUS"
    );
  } catch (error) {
    console.error("Failed to grant referral bonus:", error);
  }

  return { applied: true, referrerName: referrer.name || undefined, bonusDays: REFEREE_BONUS_DAYS };
}

/**
 * After a user completes a payment, reward their referrer once.
 * Safe to call on every completed payment — the pending→rewarded status
 * transition makes it idempotent.
 */
export async function rewardReferrerForPayment(
  db: PrismaClient,
  email: string
): Promise<{ rewarded: boolean; rewardDays: number }> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { rewarded: false, rewardDays: 0 };

  const referral = await db.referral.findUnique({
    where: { referredId: user.id },
    include: { referrer: { select: { id: true, email: true } } },
  });

  if (!referral || referral.status !== "pending") {
    return { rewarded: false, rewardDays: 0 };
  }

  const rewardDays = referral.rewardDays || REFERRER_REWARD_DAYS;

  // Grant the referrer their free premium days.
  await grantPremiumDays(
    db,
    referral.referrer.id,
    referral.referrer.email,
    rewardDays,
    "referral_reward",
    "REFREWARD"
  );

  await db.referral.update({
    where: { id: referral.id },
    data: { status: "rewarded", qualifiedAt: new Date(), rewardedAt: new Date() },
  });

  return { rewarded: true, rewardDays };
}
