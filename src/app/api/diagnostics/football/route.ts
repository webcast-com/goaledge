import { NextRequest, NextResponse } from "next/server";
import {
  getApiKeyInfo,
  getCacheSnapshot,
  getLastUpstreamAttempt,
  getUpstreamAttempts,
  isApiConfigured,
  probeFootballApi,
} from "@/lib/football-api";

export const dynamic = "force-dynamic";

/**
 * GET /api/diagnostics/football
 *
 * Explains why the live football data is (not) showing up. Every request the app
 * makes to football-data.org is recorded, so this endpoint can answer the usual
 * "the API has no matches but the league table works" question without guessing:
 *
 *  - no API key configured        → everything is seed data
 *  - `null` status                → the request never reached the API (network/DNS/TLS)
 *  - 401 / 403                    → the key is invalid or the plan does not cover the resource
 *  - 429                          → free-tier rate limit (10 requests/minute)
 *  - 200 with 0 items             → the API answered, the query simply had no fixtures
 *                                   (e.g. a `status=SCHEDULED` filter hiding TIMED matches)
 *
 * Add `?probe=1` to actively re-query three endpoints (bypassing the cache).
 * That takes ~20s because the free tier allows 10 requests/minute.
 */
export async function GET(request: NextRequest) {
  const probeParam = new URL(request.url).searchParams.get("probe") ?? "";
  const shouldProbe = ["1", "true", "yes"].includes(probeParam.toLowerCase());

  // Resolve the key first: getApiKeyInfo() reports what the last lookup found.
  const configured = await isApiConfigured();
  const key = await getApiKeyInfo();
  const history = getUpstreamAttempts();
  const last = getLastUpstreamAttempt();
  const cache = getCacheSnapshot();

  const problems: string[] = [];
  if (!configured) {
    problems.push(
      "No football-data.org API key is configured — every endpoint falls back to seed/demo data. " +
        "Set FOOTBALL_API_KEY in .env or save one in Admin → API Key.",
    );
  }
  if (key.envShadowed) {
    problems.push(
      `A key stored in the database (…${key.suffix}) takes precedence over FOOTBALL_API_KEY in .env ` +
        `(…${key.envSuffix}), so editing .env has no effect. Delete the stored key ` +
        "(DELETE /api/settings/api-key) to fall back to .env.",
    );
  }
  if (last && last.status === null) {
    problems.push(
      `The request to football-data.org never produced an HTTP response (${last.error}). ` +
        "That is a network-level failure (Docker network / blocked egress / DNS / TLS), not a data problem.",
    );
  }
  if (last && (last.status === 401 || last.status === 403)) {
    problems.push(
      `HTTP ${last.status} from football-data.org — the key is invalid or the subscription does not ` +
        `cover that resource${last.error ? ` (${last.error})` : ""}.`,
    );
  }
  if (last && last.status === 429) {
    problems.push(
      "HTTP 429 — free-tier rate limit (10 requests/minute). The app waits 60s and retries once, " +
        "which is why a page load can look stuck.",
    );
  }
  if (last?.ok && last.items === 0) {
    problems.push(
      `The last call succeeded but returned 0 items for ${last.url} — the API is reachable and the ` +
        "key is fine, this specific query just had no fixtures/rows (check the status filter and date window).",
    );
  }

  const probes = shouldProbe ? await probeFootballApi() : null;

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    key,
    apiConfigured: configured,
    problems,
    lastUpstream: last,
    upstreamHistory: history.slice(-10),
    cache,
    probes,
    hint: shouldProbe
      ? undefined
      : "Add ?probe=1 to re-query football-data.org directly (takes ~20s, free tier = 10 req/min).",
  });
}
