/**
 * Simple in-memory rate limiter for API endpoints.
 *
 * Sliding-window limiter keyed by IP + route. This is a per-process guard
 * against casual abuse (spam signups, brute force, etc.) — for a multi-instance
 * deployment swap it for a Redis-backed limiter.
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

// Keep the map from growing forever.
const MAX_BUCKETS = 5000;
const WINDOW_MS = 60 * 1000;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  limit: number;
  retryAfterSec?: number;
}

function prune(key: string, windowMs: number, now: number) {
  const bucket = buckets.get(key);
  if (!bucket) return;
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length === 0) buckets.delete(key);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(
  key: string,
  limit = 20,
  windowMs = WINDOW_MS
): RateLimitResult {
  const now = Date.now();

  if (buckets.size >= MAX_BUCKETS) {
    // Defensive: if we hit the cap, let requests through rather than break the app.
    return { ok: true, remaining: limit, limit };
  }

  prune(key, windowMs, now);

  const bucket = buckets.get(key) ?? { timestamps: [] };
  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { ok: false, remaining: 0, limit, retryAfterSec };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: limit - bucket.timestamps.length, limit };
}

/** Build a NextResponse with standard RateLimit headers. */
export function rateLimitResponse(retryAfterSec?: number) {
  return Response.json(
    { error: "Too many requests — please slow down and try again." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec ?? 60),
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
