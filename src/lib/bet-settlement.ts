/**
 * Bet settlement logic
 * --------------------
 * When a tip is marked won/lost/void (via the admin panel), every pending
 * placed bet that includes that tip is re-evaluated:
 *   - any leg lost            → bet lost
 *   - any leg still pending   → bet stays pending (result array updated)
 *   - all legs won            → bet won
 *   - all legs void           → bet void
 *   - mix of won + void       → bet partial
 */

import type { DbClient } from "@/lib/db";

interface BetLeg {
  tipId: string;
  [key: string]: unknown;
}

const SETTLED_STATUSES = ["won", "lost", "void"];

function parseLegs(legs: string): BetLeg[] {
  try {
    const parsed = JSON.parse(legs);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Re-evaluate and settle a single bet based on its legs' tip statuses. */
export async function settleBet(db: DbClient, betId: string) {
  const bet = await db.orm.PlacedBet.first({ id: betId });
  if (!bet || bet.status !== "pending") return;

  const legs = parseLegs(bet.legs);
  if (legs.length === 0) return;

  const tipIds = Array.from(new Set(legs.map((l) => l.tipId)));
  const tips = await db.orm.Tip.where((t) => t.id.in(tipIds))
    .select("id", "status")
    .all();
  const statusById = new Map(tips.map((t) => [t.id, t.status]));

  const results = legs.map((l) => {
    const tipStatus = statusById.get(l.tipId);
    // Only won/lost/void count as settled — anything else ("upcoming",
    // missing tip) keeps the leg pending.
    const settled =
      tipStatus === "won" || tipStatus === "lost" || tipStatus === "void"
        ? tipStatus
        : "pending";
    return { tipId: l.tipId, result: settled };
  });

  let hasLost = false;
  let hasPending = false;
  let hasWon = false;
  let hasVoid = false;
  for (const r of results) {
    if (r.result === "lost") hasLost = true;
    else if (r.result === "pending") hasPending = true;
    else if (r.result === "won") hasWon = true;
    else if (r.result === "void") hasVoid = true;
  }

  let status: string;
  if (hasLost) status = "lost";
  else if (hasPending) status = "pending";
  else if (hasVoid && hasWon) status = "partial";
  else if (hasVoid) status = "void";
  else status = "won";

  const data: { result: string; status?: string; settledAt?: Date } = {
    result: JSON.stringify(results),
  };
  if (status !== "pending") {
    data.status = status;
    data.settledAt = new Date();
  }

  await db.orm.PlacedBet.where({ id: bet.id }).update(data);
}

/** Settle every pending bet that includes the given tip. */
export async function settleBetsForTip(db: DbClient, tipId: string) {
  const pendingBets = await db.orm.PlacedBet.where({ status: "pending" }).all();
  const affected = pendingBets.filter((bet) =>
    parseLegs(bet.legs).some((l) => l.tipId === tipId)
  );
  for (const bet of affected) {
    await settleBet(db, bet.id);
  }
}

export function isSettledStatus(status: string): boolean {
  return SETTLED_STATUSES.includes(status);
}
