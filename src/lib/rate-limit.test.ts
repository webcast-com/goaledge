import { describe, expect, it, vi } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const r = rateLimit("test-1", 3, 60_000);
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it("blocks once the limit is hit", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);
    const third = rateLimit(key, 2, 60_000);
    expect(third.ok).toBe(false);
    expect(third.remaining).toBe(0);
    expect(third.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    try {
      const key = `window-${Date.now()}`;
      rateLimit(key, 1, 1000);
      expect(rateLimit(key, 1, 1000).ok).toBe(false);
      vi.advanceTimersByTime(1001);
      expect(rateLimit(key, 1, 1000).ok).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("treats different keys independently", () => {
    rateLimit("key-a", 1, 60_000);
    expect(rateLimit("key-b", 1, 60_000).ok).toBe(true);
  });
});
