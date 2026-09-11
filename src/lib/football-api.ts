/**
 * Football Data Service
 * Uses football-data.org API (free tier: 10 req/min)
 * With aggressive in-memory caching and graceful fallback to seed data.
 * Supports dynamic API key loading from DB or env.
 */

import { db } from "@/lib/db";

const BASE_URL = "https://api.football-data.org/v4";

// ── Dynamic API Key ──────────────────────────────────────────────────────
let _dynamicApiKey: string | null = null;
let _keyLoaded = false;
let _keySource: "database" | "env" | "none" = "none";

/**
 * Get the effective API key.
 *
 * A key saved from the Admin → API Key panel lives in the DB and **wins over
 * FOOTBALL_API_KEY in .env**. That surprises people who rotate the env var and
 * still see the old key being used — `getApiKeyInfo()` reports which one is live.
 */
export async function getApiKey(): Promise<string> {
  // If we already loaded a key this process, use that
  if (_keyLoaded && _dynamicApiKey !== null) return _dynamicApiKey;

  // Try to load from database first
  try {
    const setting = await db.appSetting.findUnique({
      where: { key: "football_api_key" },
    });
    if (setting?.value) {
      _dynamicApiKey = setting.value;
      _keyLoaded = true;
      _keySource = "database";
      return setting.value;
    }
  } catch (err) {
    // DB not ready — fall through to env. Log it: without this a broken DB read
    // silently switches the app to a different (possibly stale) key.
    console.warn(
      `[football-api] could not read the stored API key (${describeError(err)}) — falling back to FOOTBALL_API_KEY`
    );
  }

  // Fall back to env
  const envKey = process.env.FOOTBALL_API_KEY || "";
  if (envKey) {
    _dynamicApiKey = envKey;
    _keyLoaded = true;
    _keySource = "env";
  } else {
    _keySource = "none";
  }
  return _dynamicApiKey || "";
}

/** Diagnostics: where the key in use comes from (never the key itself). */
export function getApiKeyInfo() {
  const envKey = process.env.FOOTBALL_API_KEY || "";
  return {
    source: _keySource,
    configured: !!_dynamicApiKey,
    suffix: _dynamicApiKey ? _dynamicApiKey.slice(-4) : null,
    envConfigured: !!envKey,
    envSuffix: envKey ? envKey.slice(-4) : null,
    /**
     * true when a DB-saved key different from .env is in use, i.e. editing
     * FOOTBALL_API_KEY in .env (or the platform secrets) has no effect until the
     * stored key is removed (DELETE /api/settings/api-key).
     */
    envShadowed:
      !!envKey && _keySource === "database" && !!_dynamicApiKey && _dynamicApiKey !== envKey,
  };
}

/** Force-update the cached API key (e.g., after saving a new one) */
export async function refreshApiKey(): Promise<string> {
  _keyLoaded = false;
  _dynamicApiKey = null;
  _keySource = "none";
  return getApiKey();
}

/** Clear the cached key (e.g., after deleting from DB) */
export function clearApiKey(): void {
  _dynamicApiKey = null;
  _keyLoaded = false;
  _keySource = "none";
  // Also clear all caches so stale data isn't served
  cache.clear();
}

// ── Cache ───────────────────────────────────────────────────────────────
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const LIVE_TTL = 30 * 1000; // 30 seconds for live data
const STANDINGS_TTL = 15 * 60 * 1000; // 15 minutes for standings

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

/** Diagnostics: what the in-memory cache currently holds. */
export function getCacheSnapshot() {
  return [...cache.entries()].map(([key, entry]) => ({
    key,
    items: Array.isArray(entry.data) ? entry.data.length : 1,
    expiresInSeconds: Math.max(0, Math.round((entry.expiresAt - Date.now()) / 1000)),
  }));
}

// ── Upstream diagnostics ────────────────────────────────────────────────
/**
 * Every call the app makes to football-data.org is recorded here. Previously a
 * failed call was collapsed into `null` and silently replaced by seed data, so
 * "no matches" could mean *anything*: no key, network blocked, 403 (plan does
 * not cover the resource), 429 (rate limit) or simply an empty window.
 */
export interface UpstreamAttempt {
  url: string;
  /** ISO timestamp of when the request finished */
  at: string;
  ms: number;
  /** HTTP status, or null when no response arrived (DNS/TLS/timeout/offline) */
  status: number | null;
  ok: boolean;
  /** how many matches / table rows the caller parsed out of the response */
  items?: number;
  /** short error message for failed calls */
  error?: string;
}

const attempts: UpstreamAttempt[] = [];
const MAX_REMEMBERED_ATTEMPTS = 25;

function rememberAttempt(attempt: UpstreamAttempt): void {
  attempts.push(attempt);
  if (attempts.length > MAX_REMEMBERED_ATTEMPTS) {
    attempts.splice(0, attempts.length - MAX_REMEMBERED_ATTEMPTS);
  }
}

/** Diagnostics: every upstream call made by this process (oldest first). */
export function getUpstreamAttempts(): UpstreamAttempt[] {
  return attempts.map((a) => ({ ...a }));
}

export function getLastUpstreamAttempt(): UpstreamAttempt | null {
  const last = attempts[attempts.length - 1];
  return last ? { ...last } : null;
}

/**
 * One-line reason live data is missing — meant for API responses and UI tooltips:
 * "network error — fetch failed: …" or "HTTP 403 — The resource … is restricted".
 */
export function getUpstreamNote(): string | null {
  const last = attempts[attempts.length - 1];
  if (!last || last.ok) return null;
  if (last.status === null) return `network error — ${last.error ?? "request failed"}`;
  return `HTTP ${last.status}${last.error ? ` — ${last.error}` : ""}`;
}

/** Attach the number of parsed items to the most recent attempt for a URL. */
function recordItems(url: string, items: number): void {
  for (let i = attempts.length - 1; i >= 0; i--) {
    if (attempts[i].url === url) {
      attempts[i].items = items;
      return;
    }
  }
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    // "fetch failed" hides the real cause (certificate error, ECONNRESET, …)
    const cause = (err as { cause?: unknown }).cause;
    if (cause instanceof Error && cause.message && cause.message !== err.message) {
      return `${err.message}: ${cause.message}`;
    }
    return err.message;
  }
  return String(err);
}

/** Read (a slice of) a failed response body without throwing. */
async function shortBody(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200).replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

// ── Rate Limiter ────────────────────────────────────────────────────────
const requestQueue: Array<() => void> = [];
let isProcessing = false;
// ~10 requests per minute (a bit under the free-tier limit). Override when the
// plan allows more (e.g. FOOTBALL_API_MIN_INTERVAL_MS=3000 for 20 req/min).
const parsedInterval = Number(process.env.FOOTBALL_API_MIN_INTERVAL_MS ?? 6100);
const MIN_INTERVAL = Number.isFinite(parsedInterval) ? Math.max(0, parsedInterval) : 6100;
const FETCH_TIMEOUT_MS = 15_000; // never let one hung request stall the queue forever
let lastRequestTime = 0;

interface UpstreamResult {
  res: Response | null;
  attempt: UpstreamAttempt | null;
}

async function requestUpstream(url: string): Promise<UpstreamResult> {
  const key = await getApiKey();
  if (!key) return { res: null, attempt: null };

  return new Promise((resolve) => {
    const execute = async () => {
      const started = Date.now();
      const attempt: UpstreamAttempt = {
        url,
        at: new Date().toISOString(),
        ms: 0,
        status: null,
        ok: false,
      };

      try {
        const waitTime = Math.max(0, MIN_INTERVAL - (Date.now() - lastRequestTime));
        if (waitTime > 0) await new Promise((r) => setTimeout(r, waitTime));
        lastRequestTime = Date.now();

        const init: RequestInit = {
          headers: { "X-Auth-Token": key },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          cache: "no-store",
        };

        let res = await fetch(url, init);

        if (res.status === 429) {
          // Rate limited — wait out the window and retry once
          console.warn(
            `[football-api] 429 from ${url} — waiting 60s before retrying (free tier allows 10 requests/minute)`
          );
          await new Promise((r) => setTimeout(r, 60000));
          res = await fetch(url, init);
        }

        attempt.ms = Date.now() - started;
        attempt.status = res.status;
        attempt.ok = res.ok;
        if (!res.ok && [401, 403, 429].includes(res.status)) {
          // The request was rejected upstream — it did not consume the free-tier
          // quota, so don't make the next call wait out the 6.1s pacing window.
          lastRequestTime = 0;
        }
        if (!res.ok) {
          attempt.error = await shortBody(res);
          console.warn(
            `[football-api] ${res.status} from ${url}${attempt.error ? ` — ${attempt.error}` : ""}`
          );
        }
        rememberAttempt(attempt);
        resolve({ res: res.ok ? res : null, attempt });
      } catch (err) {
        attempt.ms = Date.now() - started;
        attempt.error = describeError(err);
        lastRequestTime = 0; // nothing reached the API — nothing to pace against
        rememberAttempt(attempt);
        console.warn(`[football-api] request to ${url} failed: ${attempt.error}`);
        resolve({ res: null, attempt });
      }
    };

    requestQueue.push(execute);
    if (!isProcessing) {
      isProcessing = true;
      processQueue();
    }
  });
}

async function rateLimitedFetch(url: string): Promise<Response | null> {
  const { res } = await requestUpstream(url);
  return res;
}

async function processQueue() {
  while (requestQueue.length > 0) {
    const task = requestQueue.shift();
    if (task) await task();
  }
  isProcessing = false;
}

// ── Types ───────────────────────────────────────────────────────────────
export interface Competition {
  id: number;
  name: string;
  code: string;
  emblem: string;
  country: string;
  type: string;
}

export interface FootballMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  homeTeam: string;
  awayTeam: string;
  homeTeamCrest: string;
  awayTeamCrest: string;
  homeScore: number | null;
  awayScore: number | null;
  competition: string;
  competitionEmblem: string;
  competitionCode: string;
  minute?: number;
}

export interface StandingEntry {
  position: number;
  team: string;
  crest: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string;
}

export interface LeagueStandings {
  competition: string;
  emblem: string;
  standings: StandingEntry[];
}

// ── League Config ───────────────────────────────────────────────────────
const LEAGUES: Record<string, { id: number; country: string; flag: string }> = {
  PL: { id: 2021, country: "England", flag: "🦁" },
  PD: { id: 2014, country: "Spain", flag: "🇪🇸" },
  BL1: { id: 2002, country: "Germany", flag: "🇩🇪" },
  SA: { id: 2019, country: "Italy", flag: "🇮🇹" },
  FL1: { id: 2015, country: "France", flag: "🇫🇷" },
  CL: { id: 2001, country: "Europe", flag: "🏆" },
  EL: { id: 2003, country: "Europe", flag: "🇪🇺" },
  EC: { id: 2018, country: "Europe", flag: "🌍" },
  WC: { id: 2000, country: "World", flag: "🌎" },
  PPL: { id: 2017, country: "Portugal", flag: "🇵🇹" },
  DED: { id: 2003, country: "Netherlands", flag: "🇳🇱" },
  BSA: { id: 2013, country: "Brazil", flag: "🇧🇷" },
  RSA: { id: 2030, country: "South Africa", flag: "🇿🇦" },
};

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Statuses that mean "fixture not played yet".
 *
 * football-data.org flips a match from SCHEDULED to **TIMED** as soon as the
 * exact kick-off date/time is confirmed (see the v4 status workflow). Asking for
 * `?status=SCHEDULED` therefore hides every fixture whose kick-off time is
 * already fixed — which is how "the API has no matches" happens while the
 * standings endpoint (no status filter) keeps working.
 */
const UPCOMING_STATUSES = ["SCHEDULED", "TIMED"];

function isUpcomingStatus(status: string): boolean {
  return UPCOMING_STATUSES.includes(status);
}

/** v4 treats `dateTo` as exclusive, so offset by +1 day when covering a window. */
function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

function byKickoff(a: FootballMatch, b: FootballMatch): number {
  return a.utcDate.localeCompare(b.utcDate);
}

// ── API Functions ───────────────────────────────────────────────────────

export async function isApiConfigured(): Promise<boolean> {
  const key = await getApiKey();
  return !!key;
}

/**
 * Get available competitions
 */
export async function getCompetitions(): Promise<Competition[]> {
  const cacheKey = "competitions";
  const cached = getCached<Competition[]>(cacheKey);
  if (cached) return cached;

  const res = await rateLimitedFetch(`${BASE_URL}/competitions`);
  if (res) {
    const data = await res.json();
    const comps: Competition[] = (data.competitions || [])
      .filter((c: Record<string, unknown>) => c.plan === "TIER_ONE" || c.plan === "TIER_TWO")
      .map((c: Record<string, unknown>) => ({
        id: c.id as number,
        name: c.name as string,
        code: (c.code as string) || "",
        emblem: (c.emblem as string) || "",
        country: (c.area as Record<string, string> | undefined)?.name || "",
        type: c.type as string,
      }));
    setCache(cacheKey, comps, 60 * 60 * 1000); // 1 hour
    return comps;
  }

  // Fallback
  return Object.entries(LEAGUES).map(([code, info]) => ({
    id: info.id,
    name: code,
    code,
    emblem: "",
    country: info.country,
    type: "LEAGUE",
  }));
}

/**
 * Get upcoming matches for a league
 */
export async function getUpcomingMatches(leagueCode: string, count = 10): Promise<FootballMatch[]> {
  const cacheKey = `upcoming_${leagueCode}_${count}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  const league = LEAGUES[leagueCode];
  if (!league) return [];

  // No `status=` filter on purpose — filtering on SCHEDULED alone would hide
  // TIMED fixtures (kick-off time already confirmed). Filter locally instead.
  const url = `${BASE_URL}/competitions/${league.id}/matches?dateFrom=${isoDate(0)}&dateTo=${isoDate(8)}`;
  const res = await rateLimitedFetch(url);
  if (!res) return [];

  const data = await res.json();
  const matches = parseMatches((data.matches || []) as Record<string, unknown>[], leagueCode)
    .filter((m) => isUpcomingStatus(m.status))
    .sort(byKickoff)
    .slice(0, count);

  recordItems(url, matches.length);
  // Only cache a non-empty result: caching `[]` would freeze the seed fallback
  // in place for the whole TTL even after the API recovers.
  if (matches.length > 0) setCache(cacheKey, matches, DEFAULT_TTL);
  return matches;
}

/**
 * Get all upcoming matches across supported leagues
 */
export async function getAllUpcomingMatches(maxPerLeague = 5): Promise<FootballMatch[]> {
  const cacheKey = `all_upcoming_${maxPerLeague}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  const codes = ["PL", "PD", "BL1", "SA", "FL1", "CL"];

  // One request for the whole window (dateTo is exclusive → +8 days ≈ 7 days).
  const url = `${BASE_URL}/matches?dateFrom=${isoDate(0)}&dateTo=${isoDate(8)}`;
  const res = await rateLimitedFetch(url);

  if (res) {
    const data = await res.json();
    const matches = (data.matches || [])
      .filter((m: Record<string, unknown>) => {
        const comp = m.competition as Record<string, string> | undefined;
        return comp && codes.includes(comp.code || "");
      })
      .map((m: Record<string, unknown>) => parseMatch(m))
      .filter((m: FootballMatch) => isUpcomingStatus(m.status))
      .sort(byKickoff);

    recordItems(url, matches.length);
    if (matches.length > 0) {
      setCache(cacheKey, matches, DEFAULT_TTL);
      return matches;
    }
    // The API answered and the window is genuinely empty (international break,
    // off-season). Don't cache that — and don't hammer the rate limiter with
    // per-league retries that can only find the same nothing.
    return [];
  }

  // The all-matches call failed. A missing key / blocked network / rate limit
  // hits every league the same way — don't burn the free-tier budget on 6 more
  // requests (6 s each) that are guaranteed to fail identically. A 403 is worth
  // retrying per league though: the plan can allow competition-scoped matches
  // while the cross-competition endpoint is restricted.
  const last = getLastUpstreamAttempt();
  if (!last || last.status === null || last.status === 401 || last.status === 429) {
    return [];
  }

  // Fallback: fetch per league, with a hard time budget so one request can't
  // sit in the queue for a minute while the page waits for its tips.
  const FALLBACK_BUDGET_MS = 25_000;
  const fallbackStarted = Date.now();
  const allMatches: FootballMatch[] = [];

  for (const code of codes) {
    if (Date.now() - fallbackStarted > FALLBACK_BUDGET_MS) break;
    const matches = await getUpcomingMatches(code, maxPerLeague);
    allMatches.push(...matches);
  }
  allMatches.sort(byKickoff);

  if (allMatches.length > 0) setCache(cacheKey, allMatches, DEFAULT_TTL);
  return allMatches;
}

/**
 * Get live/in-play matches
 */
export async function getLiveMatches(): Promise<FootballMatch[]> {
  const cacheKey = "live_matches";
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  // Short cache only: an empty live board must be re-checked quickly.
  const url = `${BASE_URL}/matches?status=IN_PLAY,PAUSED`;
  const res = await rateLimitedFetch(url);
  if (res) {
    const data = await res.json();
    const matches = (data.matches || []).map((m: Record<string, unknown>) => parseMatch(m));
    recordItems(url, matches.length);
    setCache(cacheKey, matches, LIVE_TTL);
    return matches;
  }

  return [];
}

/**
 * Get finished matches (results)
 */
export async function getFinishedMatches(dateFrom?: string, dateTo?: string): Promise<FootballMatch[]> {
  const cacheKey = `finished_${dateFrom}_${dateTo}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  // dateTo is exclusive in v4 — default to the day after `dateFrom` so a
  // single-day request actually covers that day.
  const from = dateFrom || isoDate(0);
  const to = dateTo || isoDate(1);

  const url = `${BASE_URL}/matches?dateFrom=${from}&dateTo=${to}&status=FINISHED`;
  const res = await rateLimitedFetch(url);

  if (res) {
    const data = await res.json();
    const matches = (data.matches || [])
      .map((m: Record<string, unknown>) => parseMatch(m))
      .sort(byKickoff);
    recordItems(url, matches.length);
    if (matches.length > 0) setCache(cacheKey, matches, 15 * 60 * 1000); // 15 min
    return matches;
  }

  return [];
}

/**
 * Get league standings
 */
export async function getStandings(leagueCode: string): Promise<LeagueStandings | null> {
  const cacheKey = `standings_${leagueCode}`;
  const cached = getCached<LeagueStandings>(cacheKey);
  if (cached) return cached;

  const league = LEAGUES[leagueCode];
  if (!league) return null;

  const url = `${BASE_URL}/competitions/${league.id}/standings`;
  const res = await rateLimitedFetch(url);

  if (res) {
    const data = await res.json();
    const totalStandings = data.standings?.[0];
    if (!totalStandings) return null;

    const standings: StandingEntry[] = (totalStandings.table || []).map(
      (t: Record<string, unknown>) => ({
        position: t.position as number,
        team: (t.team as Record<string, string>)?.name || "",
        crest: (t.team as Record<string, string>)?.crest || "",
        played: t.playedGames as number,
        won: t.won as number,
        draw: t.draw as number,
        lost: t.lost as number,
        points: t.points as number,
        goalsFor: t.goalsFor as number,
        goalsAgainst: t.goalsAgainst as number,
        goalDifference: t.goalDifference as number,
        form: (t.form as string) || "",
      })
    );

    const result: LeagueStandings = {
      competition: totalStandings.competition?.name || leagueCode,
      emblem: totalStandings.competition?.emblem || "",
      standings,
    };

    recordItems(url, standings.length);
    if (standings.length > 0) setCache(cacheKey, result, STANDINGS_TTL);
    return result;
  }

  return null;
}

/**
 * Get multiple league standings
 */
export async function getAllStandings(): Promise<LeagueStandings[]> {
  const codes = ["PL", "PD", "BL1", "SA", "FL1"];
  const results: LeagueStandings[] = [];

  for (const code of codes) {
    // Stop as soon as the API is clearly unreachable: a blocked network / bad key
    // fails every league identically, and one failed request per league used to
    // stack up to ~30s of latency before the route fell back to seed data.
    if (results.length === 0 && code !== codes[0]) {
      const last = getLastUpstreamAttempt();
      if (last && !last.ok && (last.status === null || last.status === 401 || last.status === 429)) {
        break;
      }
    }
    const standings = await getStandings(code);
    if (standings) results.push(standings);
  }

  return results;
}

/**
 * Get head-to-head data between two teams
 */
export async function getHeadToHead(team1Id: number, team2Id: number): Promise<FootballMatch[]> {
  const cacheKey = `h2h_${team1Id}_${team2Id}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  const res = await rateLimitedFetch(
    `${BASE_URL}/teams/${team1Id}/matches?opponent=${team2Id}&limit=5`
  );

  if (res) {
    const data = await res.json();
    const matches = (data.matches || []).map((m: Record<string, unknown>) => parseMatch(m));
    setCache(cacheKey, matches, 60 * 60 * 1000); // 1 hour
    return matches;
  }

  return [];
}

/**
 * Get team's recent form (last 5 matches)
 */
export async function getTeamForm(teamId: number): Promise<FootballMatch[]> {
  const cacheKey = `form_${teamId}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  const res = await rateLimitedFetch(
    `${BASE_URL}/teams/${teamId}/matches?status=FINISHED&limit=5`
  );

  if (res) {
    const data = await res.json();
    const matches = (data.matches || []).map((m: Record<string, unknown>) => parseMatch(m));
    setCache(cacheKey, matches, 15 * 60 * 1000);
    return matches;
  }

  return [];
}

/**
 * Get match details by ID
 */
export async function getMatchById(matchId: number): Promise<FootballMatch | null> {
  const cacheKey = `match_${matchId}`;
  const cached = getCached<FootballMatch>(cacheKey);
  if (cached) return cached;

  const res = await rateLimitedFetch(`${BASE_URL}/matches/${matchId}`);
  if (res) {
    const data = await res.json();
    const match = parseMatch(data);
    setCache(cacheKey, match, DEFAULT_TTL);
    return match;
  }

  return null;
}

// ── Parsers ─────────────────────────────────────────────────────────────

function parseMatch(m: Record<string, unknown>): FootballMatch {
  const homeTeam = (m.homeTeam as Record<string, string>) || { name: "Unknown", crest: "" };
  const awayTeam = (m.awayTeam as Record<string, string>) || { name: "Unknown", crest: "" };
  const competition = (m.competition as Record<string, string>) || { name: "Unknown", emblem: "", code: "" };
  const score = (m.score as Record<string, unknown>) || {};
  const fullTime = (score.fullTime as Record<string, number>) || {};
  const halfTime = (score.halfTime as Record<string, number>) || {};

  return {
    id: m.id as number,
    utcDate: m.utcDate as string,
    status: m.status as string,
    matchday: (m.matchday as number) || 0,
    homeTeam: homeTeam.name || "Unknown",
    awayTeam: awayTeam.name || "Unknown",
    homeTeamCrest: homeTeam.crest || "",
    awayTeamCrest: awayTeam.crest || "",
    homeScore: fullTime.home != null ? fullTime.home : null,
    awayScore: fullTime.away != null ? fullTime.away : null,
    competition: competition.name || "Unknown",
    competitionEmblem: competition.emblem || "",
    competitionCode: competition.code || "",
    minute: (m.minute as number) || undefined,
  };
}

function parseMatches(matches: Record<string, unknown>[], leagueCode?: string): FootballMatch[] {
  return matches.map((m) => {
    const parsed = parseMatch(m);
    if (leagueCode && !parsed.competitionCode) {
      parsed.competitionCode = leagueCode;
    }
    return parsed;
  });
}

// ── Diagnostics ─────────────────────────────────────────────────────────

export interface ProbeResult {
  name: string;
  url: string;
  /** HTTP status, or null when the request never got a response */
  status: number | null;
  ms: number;
  ok: boolean;
  error?: string;
  summary: Record<string, unknown>;
}

/** Summarise a matches payload: total + breakdown by match status. */
function summariseMatches(payload: Record<string, unknown>) {
  const matches = (payload.matches as Record<string, unknown>[]) || [];
  const byStatus: Record<string, number> = {};
  for (const m of matches) {
    const status = String(m.status ?? "UNKNOWN");
    byStatus[status] = (byStatus[status] ?? 0) + 1;
  }
  return {
    count: matches.length,
    byStatus,
    upcoming: (byStatus.SCHEDULED ?? 0) + (byStatus.TIMED ?? 0),
  };
}

/**
 * Actively query football-data.org (bypassing the cache) and report what each
 * endpoint answered — the fastest way to tell "no key" / "network blocked" /
 * "403: plan does not cover this resource" / "nothing scheduled" apart.
 *
 * Stays at 3 requests and goes through the shared rate limiter
 * (free tier = 10 requests/minute), so it takes ~20s.
 */
export async function probeFootballApi(): Promise<ProbeResult[]> {
  const today = isoDate(0);
  const inAWeek = isoDate(8);

  const endpoints: Array<{
    name: string;
    url: string;
    summarise: (data: Record<string, unknown>) => Record<string, unknown>;
  }> = [
    {
      name: "key check — /v4/competitions/PL",
      url: `${BASE_URL}/competitions/PL`,
      summarise: (d) => ({ competition: d.name ?? null, plan: d.plan ?? null }),
    },
    {
      name: "league table — /v4/competitions/2021/standings",
      url: `${BASE_URL}/competitions/2021/standings`,
      summarise: (d) => {
        const blocks = (d.standings as Record<string, unknown>[] | undefined) ?? [];
        const table = (blocks[0]?.table as unknown[] | undefined) ?? [];
        return { rows: table.length };
      },
    },
    {
      name: `fixtures — /v4/matches?dateFrom=${today}&dateTo=${inAWeek}`,
      url: `${BASE_URL}/matches?dateFrom=${today}&dateTo=${inAWeek}`,
      summarise: (d) => summariseMatches(d),
    },
  ];

  const results: ProbeResult[] = [];
  for (const endpoint of endpoints) {
    const { res, attempt } = await requestUpstream(endpoint.url);
    let summary: Record<string, unknown> = {};
    if (res) {
      try {
        summary = endpoint.summarise((await res.json()) as Record<string, unknown>);
      } catch (err) {
        summary = { parseError: describeError(err) };
      }
    }
    results.push({
      name: endpoint.name,
      url: endpoint.url,
      status: attempt?.status ?? null,
      ms: attempt?.ms ?? 0,
      ok: !!attempt?.ok,
      error: attempt?.error,
      summary,
    });
  }
  return results;
}

// ── Tip Generation Helpers ──────────────────────────────────────────────

export interface GeneratedTip {
  id: string;
  league: string;
  country: string;
  flag: string;
  homeTeam: string;
  awayTeam: string;
  matchTime: string;
  predictionType: string;
  prediction: string;
  odds: string;
  confidence: number;
  confidenceLabel: string;
  status: string;
  tipster: string;
  isPremium: boolean;
  homeTeamCrest: string;
  awayTeamCrest: string;
  matchId: number;
  competitionCode: string;
}

/**
 * Generate tips from real match data with AI-like predictions
 */
export function generateTipsFromMatches(matches: FootballMatch[]): GeneratedTip[] {
  const predictionTypes = [
    { type: "Match Result", getPrediction: (h: string, a: string) => `${h} to Win` },
    { type: "Match Result", getPrediction: (h: string, _a: string) => `${h} to Win` },
    { type: "Over/Under", getPrediction: (_h: string, _a: string) => `Over 2.5 Goals` },
    { type: "Both Teams to Score", getPrediction: (_h: string, _a: string) => `BTTS - Yes` },
    { type: "Double Chance", getPrediction: (h: string, _a: string) => `Double Chance - Home/Draw` },
    { type: "Match Result", getPrediction: (_h: string, a: string) => `${a} to Win` },
    { type: "Under/Over", getPrediction: (_h: string, _a: string) => `Under 3.5 Goals` },
    { type: "Match Result", getPrediction: (h: string, a: string) => `Draw` },
  ];

  const tipsters = ["GoalEdge AI", "Data Analyst", "Arena Tipster", "Local Expert"];

  return matches.map((match, index) => {
    const leagueInfo = LEAGUES[match.competitionCode] || {
      country: "Unknown",
      flag: "⚽",
    };

    // Deterministic selection based on match id
    const predIndex = match.id % predictionTypes.length;
    const pred = predictionTypes[predIndex];
    const tipster = tipsters[match.id % tipsters.length];

    // Generate realistic odds based on prediction type
    const baseOdds = getOddsForPrediction(pred.type, index);
    const confidence = Math.min(95, 65 + (index % 4) * 8);
    const confidenceLabel =
      confidence >= 85
        ? "Very High"
        : confidence >= 75
          ? "High"
          : confidence >= 60
            ? "Medium"
            : "Low";

    const matchDate = new Date(match.utcDate);
    const matchTimeStr = formatMatchTime(matchDate);

    return {
      id: `real_${match.id}`,
      league: match.competition,
      country: leagueInfo.country,
      flag: leagueInfo.flag,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      matchTime: matchTimeStr,
      predictionType: pred.type,
      prediction: pred.getPrediction(match.homeTeam, match.awayTeam),
      odds: baseOdds.toFixed(2),
      confidence,
      confidenceLabel,
      status: "upcoming",
      tipster,
      isPremium: index % 3 === 2, // Every 3rd tip is premium
      homeTeamCrest: match.homeTeamCrest,
      awayTeamCrest: match.awayTeamCrest,
      matchId: match.id,
      competitionCode: match.competitionCode,
    };
  });
}

function getOddsForPrediction(type: string, index: number): number {
  const base = 1.2 + (index * 0.13) % 1.3;
  switch (type) {
    case "Match Result":
      return Math.round((1.3 + (index * 0.15) % 0.9) * 100) / 100;
    case "Over/Under":
    case "Under/Over":
      return Math.round((1.5 + (index * 0.1) % 0.6) * 100) / 100;
    case "Both Teams to Score":
      return Math.round((1.6 + (index * 0.12) % 0.5) * 100) / 100;
    case "Double Chance":
      return Math.round((1.25 + (index * 0.08) % 0.35) * 100) / 100;
    default:
      return Math.round(base * 100) / 100;
  }
}

function formatMatchTime(date: Date): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const day = date.getUTCDate();
  const month = months[date.getUTCMonth()];
  const hours = String(date.getUTCHours() + 3).padStart(2, "0"); // Convert to EAT (UTC+3)
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month}, ${hours}:${minutes}`;
}

/**
 * Convert a live match to the LiveScore format used by the frontend
 */
export function convertToLiveScore(match: FootballMatch) {
  const leagueInfo = LEAGUES[match.competitionCode] || { flag: "⚽" };

  // Estimate possession and stats based on score
  const homeGoals = match.homeScore || 0;
  const awayGoals = match.awayScore || 0;
  const homePoss = Math.min(65, 45 + (homeGoals - awayGoals) * 5 + Math.round(Math.random() * 10));
  const awayPoss = 100 - homePoss;

  return {
    id: `live_${match.id}`,
    league: match.competition,
    flag: leagueInfo.flag,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore: homeGoals,
    awayScore: awayGoals,
    minute: match.status === "HALFTIME" ? "HT" : match.minute ? `${match.minute}'` : "",
    status: "live" as const,
    possession: `${homePoss}% - ${awayPoss}%`,
    shots: `${2 + homeGoals + Math.round(Math.random() * 4)} - ${2 + awayGoals + Math.round(Math.random() * 4)}`,
    corners: `${Math.round(Math.random() * 6)} - ${Math.round(Math.random() * 6)}`,
    matchId: match.id,
    homeTeamCrest: match.homeTeamCrest,
    awayTeamCrest: match.awayTeamCrest,
  };
}

// ── Seed Data Fallback ──────────────────────────────────────────────────

export function getSeedTips(): GeneratedTip[] {
  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(13, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(today.getUTCDate() + 1);

  return [
    {
      id: "seed_1",
      league: "Premier League",
      country: "England",
      flag: "🦁",
      homeTeam: "Arsenal",
      awayTeam: "Liverpool",
      matchTime: formatMatchTime(today),
      predictionType: "Match Result",
      prediction: "Arsenal to Win",
      odds: "2.10",
      confidence: 78,
      confidenceLabel: "High",
      status: "upcoming",
      tipster: "GoalEdge AI",
      isPremium: false,
      homeTeamCrest: "",
      awayTeamCrest: "",
      matchId: 0,
      competitionCode: "PL",
    },
    {
      id: "seed_2",
      league: "La Liga",
      country: "Spain",
      flag: "🇪🇸",
      homeTeam: "Real Madrid",
      awayTeam: "Barcelona",
      matchTime: formatMatchTime(new Date(today.getTime() + 3600000 * 2)),
      predictionType: "Over/Under",
      prediction: "Over 2.5 Goals",
      odds: "1.65",
      confidence: 82,
      confidenceLabel: "High",
      status: "upcoming",
      tipster: "Data Analyst",
      isPremium: false,
      homeTeamCrest: "",
      awayTeamCrest: "",
      matchId: 0,
      competitionCode: "PD",
    },
    {
      id: "seed_3",
      league: "Serie A",
      country: "Italy",
      flag: "🇮🇹",
      homeTeam: "Inter Milan",
      awayTeam: "AC Milan",
      matchTime: formatMatchTime(new Date(today.getTime() + 3600000 * 4)),
      predictionType: "Both Teams to Score",
      prediction: "BTTS - Yes",
      odds: "1.75",
      confidence: 76,
      confidenceLabel: "High",
      status: "upcoming",
      tipster: "Arena Tipster",
      isPremium: true,
      homeTeamCrest: "",
      awayTeamCrest: "",
      matchId: 0,
      competitionCode: "SA",
    },
    {
      id: "seed_4",
      league: "Bundesliga",
      country: "Germany",
      flag: "🇩🇪",
      homeTeam: "Bayern Munich",
      awayTeam: "Dortmund",
      matchTime: formatMatchTime(tomorrow),
      predictionType: "Match Result",
      prediction: "Bayern Munich to Win",
      odds: "1.55",
      confidence: 85,
      confidenceLabel: "Very High",
      status: "upcoming",
      tipster: "GoalEdge AI",
      isPremium: false,
      homeTeamCrest: "",
      awayTeamCrest: "",
      matchId: 0,
      competitionCode: "BL1",
    },
    {
      id: "seed_5",
      league: "Ligue 1",
      country: "France",
      flag: "🇫🇷",
      homeTeam: "PSG",
      awayTeam: "Marseille",
      matchTime: formatMatchTime(new Date(tomorrow.getTime() + 3600000 * 3)),
      predictionType: "Double Chance",
      prediction: "Double Chance - Home/Draw",
      odds: "1.30",
      confidence: 88,
      confidenceLabel: "Very High",
      status: "upcoming",
      tipster: "GoalEdge AI",
      isPremium: true,
      homeTeamCrest: "",
      awayTeamCrest: "",
      matchId: 0,
      competitionCode: "FL1",
    },
    {
      id: "seed_6",
      league: "Champions League",
      country: "Europe",
      flag: "🏆",
      homeTeam: "Real Madrid",
      awayTeam: "Man City",
      matchTime: formatMatchTime(new Date(tomorrow.getTime() + 3600000 * 5)),
      predictionType: "Over/Under",
      prediction: "Over 2.5 Goals",
      odds: "1.80",
      confidence: 73,
      confidenceLabel: "Medium",
      status: "upcoming",
      tipster: "Arena Tipster",
      isPremium: true,
      homeTeamCrest: "",
      awayTeamCrest: "",
      matchId: 0,
      competitionCode: "CL",
    },
  ];
}

export function getSeedLiveScores() {
  return [
    {
      id: "seed_l1",
      league: "Premier League",
      flag: "🦁",
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      homeScore: 2,
      awayScore: 1,
      minute: "67'",
      status: "live" as const,
      possession: "55% - 45%",
      shots: "8 - 5",
      corners: "4 - 3",
      matchId: 0,
      homeTeamCrest: "",
      awayTeamCrest: "",
    },
    {
      id: "seed_l2",
      league: "La Liga",
      flag: "🇪🇸",
      homeTeam: "Barcelona",
      awayTeam: "Atletico Madrid",
      homeScore: 1,
      awayScore: 1,
      minute: "34'",
      status: "live" as const,
      possession: "62% - 38%",
      shots: "6 - 3",
      corners: "2 - 4",
      matchId: 0,
      homeTeamCrest: "",
      awayTeamCrest: "",
    },
  ];
}