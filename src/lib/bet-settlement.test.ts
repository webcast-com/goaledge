import { describe, expect, it } from "vitest";
import { settleBet } from "./bet-settlement";
import { makeOrmDb } from "@/test-support/orm-fake";

interface FakeTip {
  id: string;
  status: string;
}

interface FakeBet {
  id: string;
  status: string;
  legs: string;
  result?: string;
  settledAt?: Date;
}

/** Minimal client stand-in with the ORM surface settleBet uses. */
function makeDb(tips: FakeTip[], bets: FakeBet[]) {
  // The fake implements the slice of the ORM surface settleBet touches.
  return makeOrmDb({
    Tip: { rows: tips as unknown as Record<string, unknown>[] },
    PlacedBet: { rows: bets as unknown as Record<string, unknown>[] },
  }) as never;
}

const legs = (tipIds: string[]) =>
  JSON.stringify(tipIds.map((tipId) => ({ tipId, prediction: "x" })));

describe("settleBet", () => {
  it("marks the bet won when all legs won", async () => {
    const bets: FakeBet[] = [{ id: "b1", status: "pending", legs: legs(["t1", "t2"]) }];
    const db = makeDb(
      [{ id: "t1", status: "won" }, { id: "t2", status: "won" }],
      bets
    );
    await settleBet(db, "b1");
    expect(bets[0].status).toBe("won");
    expect(bets[0].settledAt).toBeInstanceOf(Date);
  });

  it("marks the bet lost when any leg lost", async () => {
    const bets: FakeBet[] = [{ id: "b1", status: "pending", legs: legs(["t1", "t2"]) }];
    const db = makeDb(
      [{ id: "t1", status: "won" }, { id: "t2", status: "lost" }],
      bets
    );
    await settleBet(db, "b1");
    expect(bets[0].status).toBe("lost");
  });

  it("keeps the bet pending while any leg is still upcoming", async () => {
    const bets: FakeBet[] = [{ id: "b1", status: "pending", legs: legs(["t1", "t2"]) }];
    const db = makeDb(
      [{ id: "t1", status: "won" }, { id: "t2", status: "upcoming" }],
      bets
    );
    await settleBet(db, "b1");
    expect(bets[0].status).toBe("pending");
    expect(bets[0].settledAt).toBeUndefined();
    const results = JSON.parse(bets[0].result!);
    expect(results).toEqual([
      { tipId: "t1", result: "won" },
      { tipId: "t2", result: "pending" },
    ]);
  });

  it("marks the bet void when all legs void", async () => {
    const bets: FakeBet[] = [{ id: "b1", status: "pending", legs: legs(["t1"]) }];
    const db = makeDb([{ id: "t1", status: "void" }], bets);
    await settleBet(db, "b1");
    expect(bets[0].status).toBe("void");
  });

  it("marks the bet partial on a won + void mix", async () => {
    const bets: FakeBet[] = [{ id: "b1", status: "pending", legs: legs(["t1", "t2"]) }];
    const db = makeDb(
      [{ id: "t1", status: "won" }, { id: "t2", status: "void" }],
      bets
    );
    await settleBet(db, "b1");
    expect(bets[0].status).toBe("partial");
  });

  it("treats a missing tip as pending", async () => {
    const bets: FakeBet[] = [{ id: "b1", status: "pending", legs: legs(["missing"]) }];
    const db = makeDb([], bets);
    await settleBet(db, "b1");
    expect(bets[0].status).toBe("pending");
    expect(JSON.parse(bets[0].result!)[0].result).toBe("pending");
  });

  it("does nothing to already-settled bets", async () => {
    const bets: FakeBet[] = [{ id: "b1", status: "won", legs: legs(["t1"]) }];
    const db = makeDb([{ id: "t1", status: "lost" }], bets);
    await settleBet(db, "b1");
    expect(bets[0].status).toBe("won");
  });
});
