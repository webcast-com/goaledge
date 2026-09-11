import { describe, expect, it } from "vitest";
import {
  applyReferralOnSignup,
  rewardReferrerForPayment,
  generateReferralCode,
  normalizeCode,
  REFEREE_BONUS_DAYS,
  REFERRER_REWARD_DAYS,
} from "./referrals";
import { makeOrmDb } from "@/test-support/orm-fake";

interface FakeUser {
  id: string;
  email: string;
  name?: string | null;
  referralCode?: string | null;
}

interface FakeReferral {
  id: string;
  code: string;
  referrerId: string;
  referredId: string;
  status: string;
  rewardDays: number;
  qualifiedAt?: Date | null;
  rewardedAt?: Date | null;
}

interface FakePayment {
  id: string;
  userId?: string | null;
  email: string;
  amount: number;
  plan: string;
  status: string;
  reference: string;
  expiresAt?: Date | null;
  createdAt: Date;
}

function makeDb(users: FakeUser[], referrals: FakeReferral[], payments: FakePayment[]) {
  return makeOrmDb({
    User: { rows: users as unknown as Record<string, unknown>[] },
    Referral: {
      rows: referrals as unknown as Record<string, unknown>[],
      relations: {
        referrer: (row) =>
          users.find((u) => u.id === row.referrerId) ?? null,
      },
    },
    Payment: { rows: payments as unknown as Record<string, unknown>[] },
  }) as never;
}

describe("generateReferralCode / normalizeCode", () => {
  it("generates 6-char codes from the safe alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateReferralCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });

  it("normalizes to uppercase trimmed", () => {
    expect(normalizeCode("  k7x2pq ")).toBe("K7X2PQ");
  });
});

describe("applyReferralOnSignup", () => {
  it("links the new user to the referrer and grants the bonus", async () => {
    const users: FakeUser[] = [
      { id: "u1", email: "referrer@x.com", name: "Alex", referralCode: "ABC123" },
    ];
    const referrals: FakeReferral[] = [];
    const payments: FakePayment[] = [];
    const db = makeDb(users, referrals, payments);

    const result = await applyReferralOnSignup(db, "u2", "newbie@x.com", "abc123");

    expect(result.applied).toBe(true);
    expect(result.referrerName).toBe("Alex");
    expect(result.bonusDays).toBe(REFEREE_BONUS_DAYS);
    expect(referrals).toHaveLength(1);
    expect(referrals[0]).toMatchObject({ referrerId: "u1", referredId: "u2", status: "pending" });
    const bonus = payments.find((p) => p.plan === "referral_bonus");
    expect(bonus).toBeDefined();
    expect(bonus!.userId).toBe("u2");
    expect(bonus!.status).toBe("completed");
    expect(bonus!.expiresAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it("ignores an unknown code without creating anything", async () => {
    const users: FakeUser[] = [{ id: "u1", email: "a@x.com", referralCode: "ABC123" }];
    const referrals: FakeReferral[] = [];
    const payments: FakePayment[] = [];
    const db = makeDb(users, referrals, payments);

    const result = await applyReferralOnSignup(db, "u2", "b@x.com", "ZZZZZZ");
    expect(result.applied).toBe(false);
    expect(referrals).toHaveLength(0);
    expect(payments).toHaveLength(0);
  });

  it("ignores self-referral", async () => {
    const users: FakeUser[] = [{ id: "u1", email: "a@x.com", referralCode: "ABC123" }];
    const referrals: FakeReferral[] = [];
    const payments: FakePayment[] = [];
    const db = makeDb(users, referrals, payments);

    const result = await applyReferralOnSignup(db, "u1", "a@x.com", "ABC123");
    expect(result.applied).toBe(false);
    expect(referrals).toHaveLength(0);
  });

  it("no code = no referral", async () => {
    const users: FakeUser[] = [{ id: "u1", email: "a@x.com", referralCode: "ABC123" }];
    const db = makeDb(users, [], []);
    const result = await applyReferralOnSignup(db, "u2", "b@x.com", "");
    expect(result.applied).toBe(false);
  });
});

describe("rewardReferrerForPayment", () => {
  it("rewards the referrer once on the referred user's first payment", async () => {
    const users: FakeUser[] = [
      { id: "u1", email: "referrer@x.com", name: "Alex", referralCode: "ABC123" },
      { id: "u2", email: "newbie@x.com" },
    ];
    const referrals: FakeReferral[] = [
      { id: "r1", code: "ABC123", referrerId: "u1", referredId: "u2", status: "pending", rewardDays: 7 },
    ];
    const payments: FakePayment[] = [];
    const db = makeDb(users, referrals, payments);

    const first = await rewardReferrerForPayment(db, "newbie@x.com");
    expect(first.rewarded).toBe(true);
    expect(first.rewardDays).toBe(7);
    expect(referrals[0].status).toBe("rewarded");
    expect(referrals[0].rewardedAt).toBeInstanceOf(Date);
    const reward = payments.find((p) => p.plan === "referral_reward");
    expect(reward).toBeDefined();
    expect(reward!.userId).toBe("u1");
    expect(reward!.amount).toBe(0);

    // Second call (e.g. another payment) must not double-reward.
    const second = await rewardReferrerForPayment(db, "newbie@x.com");
    expect(second.rewarded).toBe(false);
    expect(payments.filter((p) => p.plan === "referral_reward")).toHaveLength(1);
  });

  it("extends the referrer's premium from their current expiry", async () => {
    const users: FakeUser[] = [
      { id: "u1", email: "referrer@x.com", referralCode: "ABC123" },
      { id: "u2", email: "newbie@x.com" },
    ];
    const referrals: FakeReferral[] = [
      { id: "r1", code: "ABC123", referrerId: "u1", referredId: "u2", status: "pending", rewardDays: 7 },
    ];
    const existingExpiry = new Date(Date.now() + 20 * 86400000);
    const payments: FakePayment[] = [
      { id: "p0", userId: "u1", email: "referrer@x.com", amount: 500, plan: "weekly", status: "completed", reference: "r0", expiresAt: existingExpiry, createdAt: new Date() },
    ];
    const db = makeDb(users, referrals, payments);

    await rewardReferrerForPayment(db, "newbie@x.com");
    const reward = payments.find((p) => p.plan === "referral_reward")!;
    expect(reward.expiresAt!.getTime()).toBeGreaterThan(existingExpiry.getTime() + 6 * 86400000);
  });

  it("does nothing for users with no referral record", async () => {
    const users: FakeUser[] = [{ id: "u1", email: "solo@x.com" }];
    const db = makeDb(users, [], []);
    const result = await rewardReferrerForPayment(db, "solo@x.com");
    expect(result.rewarded).toBe(false);
  });

  it("does nothing for unknown emails", async () => {
    const db = makeDb([], [], []);
    const result = await rewardReferrerForPayment(db, "ghost@x.com");
    expect(result.rewarded).toBe(false);
  });
});
