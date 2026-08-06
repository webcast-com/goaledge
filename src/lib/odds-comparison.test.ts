import { describe, expect, it } from "vitest";
import { getOddsComparison } from "./odds-comparison";

const tip = {
  id: "seed_1",
  odds: "2.10",
  homeTeam: "Arsenal",
  awayTeam: "Liverpool",
  prediction: "Arsenal to Win",
};

describe("getOddsComparison", () => {
  it("returns one entry per bookmaker (5)", () => {
    const c = getOddsComparison(tip);
    expect(c.bookmakers).toHaveLength(5);
    expect(c.tipId).toBe("seed_1");
    expect(c.baseOdds).toBe(2.1);
  });

  it("marks exactly one bookmaker as best (the max odds)", () => {
    const c = getOddsComparison(tip);
    const bestEntries = c.bookmakers.filter((b) => b.isBest);
    expect(bestEntries).toHaveLength(1);
    const maxOdds = Math.max(...c.bookmakers.map((b) => b.odds));
    expect(c.best.odds).toBe(maxOdds);
    expect(c.best.isBest).toBe(true);
  });

  it("never produces odds below 1.01", () => {
    const c = getOddsComparison(tip);
    for (const b of c.bookmakers) {
      expect(b.odds).toBeGreaterThanOrEqual(1.01);
    }
  });

  it("is deterministic for the same tip", () => {
    const a = getOddsComparison(tip);
    const b = getOddsComparison(tip);
    expect(a.bookmakers.map((x) => x.odds)).toEqual(b.bookmakers.map((x) => x.odds));
  });

  it("varies between different tips", () => {
    const a = getOddsComparison(tip);
    const b = getOddsComparison({ ...tip, id: "seed_2", odds: "1.65" });
    expect(a.bookmakers.map((x) => x.odds)).not.toEqual(b.bookmakers.map((x) => x.odds));
  });

  it("builds affiliate URLs with the ref param", () => {
    const c = getOddsComparison(tip);
    for (const b of c.bookmakers) {
      expect(b.url).toContain("ref=goaledge");
      expect(b.url).toContain(b.odds.toFixed(2));
    }
  });

  it("falls back to 2.00 for invalid odds", () => {
    const c = getOddsComparison({ ...tip, odds: "abc" });
    expect(c.baseOdds).toBe(2.0);
  });
});
