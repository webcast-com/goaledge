#!/usr/bin/env node
/**
 * GoalEdge — football-data.org connectivity & permissions check.
 *
 * Answers the question "why does the app show a league table but no matches?"
 * by talking to football-data.org directly, with the same key the app uses.
 *
 * Usage (from the project root):
 *   node scripts/football-api-check.mjs                 # DB key, else FOOTBALL_API_KEY
 *   node scripts/football-api-check.mjs --key=xxxxxxxx  # try a specific key
 *   node scripts/football-api-check.mjs --delay=0       # don't wait between calls
 *   node scripts/football-api-check.mjs --base=http://localhost:4010   # against a mock
 *   docker compose exec web bun scripts/football-api-check.mjs
 *
 * No dependencies: reads .env by hand and db/custom.db with node:sqlite
 * (skipped when the runtime has no node:sqlite, e.g. Bun).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const argv = new Map(
  process.argv.slice(2).map((arg) => {
    const [k, v = "true"] = arg.replace(/^--/, "").split("=");
    return [k, v];
  }),
);
const DELAY_MS = Number(argv.get("delay") ?? 6200); // free tier: 10 requests/minute
const EXPLICIT_KEY = argv.get("key");
const BASE_URL = argv.get("base") ?? "https://api.football-data.org/v4";

// ── Key resolution (mirrors getApiKey() in src/lib/football-api.ts) ──────
function readEnvFileKey() {
  const path = resolve(ROOT, ".env");
  if (!existsSync(path)) return null;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = /^\s*FOOTBALL_API_KEY\s*=\s*(.+?)\s*$/.exec(line);
    if (match) return match[1].replace(/^["']|["']$/g, "");
  }
  return process.env.FOOTBALL_API_KEY ?? null;
}

async function readDatabaseKey() {
  const dbPath = resolve(ROOT, "db/custom.db");
  if (!existsSync(dbPath)) return { key: null, error: "db/custom.db not found" };
  // node:sqlite is still flagged experimental on Node 22 — keep its warning out
  // of the report so the output stays pasteable.
  const warningListeners = process.listeners("warning");
  process.removeAllListeners("warning");
  try {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(dbPath);
    const row = db.prepare("select value from AppSetting where key = 'football_api_key'").get();
    return { key: row?.value ?? null, error: null };
  } catch (err) {
    return { key: null, error: err instanceof Error ? err.message : String(err) };
  } finally {
    for (const listener of warningListeners) process.on("warning", listener);
  }
}

function mask(key) {
  if (!key) return "(none)";
  return `${key.slice(0, 4)}…${key.slice(-4)} (${key.length} chars)`;
}

function describeError(err) {
  if (err instanceof Error) {
    const cause = err.cause instanceof Error ? `: ${err.cause.message}` : "";
    return `${err.message}${cause}`;
  }
  return String(err);
}

// ── Probing ──────────────────────────────────────────────────────────────
async function probe(url, key) {
  const started = Date.now();
  try {
    const res = await fetch(url, { headers: { "X-Auth-Token": key } });
    const ms = Date.now() - started;
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not JSON — keep the raw text */
    }
    return {
      url,
      status: res.status,
      ms,
      ok: res.ok,
      json,
      text: text.slice(0, 240).replace(/\s+/g, " "),
      remaining: res.headers.get("x-requests-available-minute"),
    };
  } catch (err) {
    return { url, status: null, ms: Date.now() - started, ok: false, error: describeError(err) };
  }
}

function statusBreakdown(payload) {
  const counts = {};
  for (const match of payload?.matches ?? []) {
    const status = String(match.status ?? "UNKNOWN");
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return { total: (payload?.matches ?? []).length, counts };
}

const isoDate = (offsetDays = 0) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().split("T")[0];
};

// ── Main ─────────────────────────────────────────────────────────────────
const envKey = readEnvFileKey();
const db = await readDatabaseKey();
const effectiveKey = EXPLICIT_KEY || db.key || envKey;

console.log("GoalEdge — football-data.org check");
console.log("──────────────────────────────────────────────────────────────");
console.log(`FOOTBALL_API_KEY (.env)     : ${mask(envKey)}`);
console.log(`key in DB AppSetting        : ${mask(db.key)}${db.error ? `  [unreadable: ${db.error}]` : ""}`);
console.log(`key the app will actually use: ${mask(effectiveKey)}  (DB wins over .env)`);
if (db.key && envKey && db.key !== envKey) {
  console.log("⚠  The DB key shadows .env — editing FOOTBALL_API_KEY has no effect until");
  console.log("   the stored key is deleted (Admin → API Key, or DELETE /api/settings/api-key).");
}
console.log("");

if (!effectiveKey) {
  console.log("✗ No API key found — the app runs entirely on seed data.");
  process.exit(1);
}

const today = isoDate(0);
const inAWeek = isoDate(8); // dateTo is exclusive in v4

const checks = [
  { label: "key / plan  GET /competitions/PL", url: `${BASE_URL}/competitions/PL` },
  { label: "table       GET /competitions/2021/standings", url: `${BASE_URL}/competitions/2021/standings` },
  {
    label: "OLD app query  /matches?...&status=SCHEDULED",
    url: `${BASE_URL}/matches?dateFrom=${today}&dateTo=${inAWeek}&status=SCHEDULED`,
  },
  { label: "NEW app query  /matches?dateFrom..dateTo", url: `${BASE_URL}/matches?dateFrom=${today}&dateTo=${inAWeek}` },
  {
    label: "per-league  /competitions/2021/matches",
    url: `${BASE_URL}/competitions/2021/matches?dateFrom=${today}&dateTo=${inAWeek}`,
  },
];

const results = [];
for (const [index, check] of checks.entries()) {
  if (index > 0 && DELAY_MS > 0) await new Promise((r) => setTimeout(r, DELAY_MS));
  const result = await probe(check.url, effectiveKey);
  results.push({ ...check, ...result });

  const statusLabel = result.status === null ? "NO RESPONSE" : `HTTP ${result.status}`;
  console.log(`${result.ok ? "✓" : "✗"} ${check.label} → ${statusLabel} (${result.ms}ms)`);

  if (result.ok) {
    if (check.url.includes("/standings")) {
      const rows = result.json?.standings?.[0]?.table?.length ?? 0;
      console.log(`    ${rows} table rows — the league table works`);
    } else if (check.url.includes("/matches")) {
      const { total, counts } = statusBreakdown(result.json);
      console.log(`    ${total} matches — ${JSON.stringify(counts)}`);
    } else {
      console.log(`    competition=${result.json?.name} plan=${result.json?.plan}`);
    }
    if (result.remaining) console.log(`    requests left this minute: ${result.remaining}`);
  } else if (result.status === null) {
    console.log(`    no HTTP response: ${result.error}`);
    console.log("    → the request never reached the API (network/DNS/TLS/proxy), not a data problem");
  } else {
    console.log(`    body: ${result.text}`);
  }
}

// ── Verdict ──────────────────────────────────────────────────────────────
console.log("");
console.log("Verdict");
console.log("──────────────────────────────────────────────────────────────");

const oldQuery = results[2];
const newQuery = results[3];
const anyResponse = results.some((r) => r.status !== null);
const any403 = results.some((r) => r.status === 401 || r.status === 403);
const any429 = results.some((r) => r.status === 429);

if (!anyResponse) {
  console.log("• Nothing could reach api.football-data.org from this container.");
  console.log("  The app will silently serve seed data for matches AND standings.");
} else if (any403) {
  console.log("• 401/403: the key is invalid or the subscription does not include that");
  console.log("  resource. Check the key at https://www.football-data.org/client/login");
} else if (any429) {
  console.log("• 429: free-tier rate limit (10 requests/minute). The app waits 60s and");
  console.log("  retries once, which makes a page load look stuck.");
} else {
  const oldTotal = oldQuery?.json?.matches?.length ?? null;
  const newBreakdown = newQuery?.ok ? statusBreakdown(newQuery.json) : null;
  if (oldTotal === 0 && newBreakdown && newBreakdown.total > 0) {
    console.log("• Confirmed: `status=SCHEDULED` returns 0 fixtures while the same window");
    console.log("  without the filter returns matches. football-data.org flips fixtures from");
    console.log("  SCHEDULED to TIMED once the kick-off time is confirmed, so the old query");
    console.log("  hid every fixture. The app now filters SCHEDULED + TIMED locally.");
  } else if (newBreakdown && newBreakdown.total === 0) {
    console.log("• The API is reachable and authorised, but there are no fixtures at all in");
    console.log(`  the ${today} → ${inAWeek} window (international break / off-season?).`);
  } else {
    console.log("• Matches come back fine from here — the failure is inside the app");
    console.log("  (check the dev server log for [football-api] warnings).");
  }
}
