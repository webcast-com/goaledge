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

/** Get the effective API key (checks DB first, then env) */
export async function getApiKey(): Promise<string> {
  // If we already loaded from DB this process, use that
  if (_keyLoaded && _dynamicApiKey !== null) return _dynamicApiKey;

  // Try to load from database
  try {
    const setting = await db.appSetting.findUnique({
      where: { key: "football_api_key" },
    });
    if (setting?.value) {
      _dynamicApiKey = setting.value;
      _keyLoaded = true;
      return _dynamicApiKey;
    }
  } catch {
    // DB not ready — fall through to env
  }

  // Fall back to env
  const envKey = process.env.FOOTBALL_API_KEY || "";
  if (envKey) {
    _dynamicApiKey = envKey;
    _keyLoaded = true;
  }
  return _dynamicApiKey || "";
}

/** Force-update the cached API key (e.g., after saving a new one) */
export async function refreshApiKey(): Promise<string> {
  _keyLoaded = false;
  _dynamicApiKey = null;
  return getApiKey();
}

/** Clear the cached key (e.g., after deleting from DB) */
export function clearApiKey(): void {
  _dynamicApiKey = null;
  _keyLoaded = false;
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

// ── Rate Limiter ────────────────────────────────────────────────────────
const requestQueue: Array<() => void> = [];
let isProcessing = false;
const MIN_INTERVAL = 6100; // ~10 requests per minute (a bit under the limit)
let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response | null> {
  const key = await getApiKey();
  if (!key) return null;

  return new Promise((resolve) => {
    const execute = async () => {
      try {
        const now = Date.now();
        const waitTime = Math.max(0, MIN_INTERVAL - (now - lastRequestTime));
        if (waitTime > 0) await new Promise((r) => setTimeout(r, waitTime));
        lastRequestTime = Date.now();

        const res = await fetch(url, {
          headers: { "X-Auth-Token": key },
          next: { revalidate: 0 },
        });

        if (res.status === 429) {
          // Rate limited — wait and retry once
          await new Promise((r) => setTimeout(r, 60000));
          const retry = await fetch(url, {
            headers: { "X-Auth-Token": key },
          });
          resolve(retry.ok ? retry : null);
          return;
        }

        resolve(res.ok ? res : null);
      } catch {
        resolve(null);
      }
    };

    requestQueue.push(execute);
    if (!isProcessing) {
      isProcessing = true;
      processQueue();
    }
  });
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
        country: c.area?.name || (c.area as Record<string, string>)?.name || "",
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

  const res = await rateLimitedFetch(
    `${BASE_URL}/competitions/${league.id}/matches?status=SCHEDULED&limit=${count}`
  );

  if (res) {
    const data = await res.json();
    const matches = parseMatches(data.matches || [], leagueCode);
    setCache(cacheKey, matches, DEFAULT_TTL);
    return matches;
  }

  return [];
}

/**
 * Get all upcoming matches across supported leagues
 */
export async function getAllUpcomingMatches(maxPerLeague = 5): Promise<FootballMatch[]> {
  const cacheKey = `all_upcoming_${maxPerLeague}`;
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  const codes = ["PL", "PD", "BL1", "SA", "FL1", "CL"];
  const allMatches: FootballMatch[] = [];

  // Try fetching from all-matches endpoint first (single request)
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const dateFrom = today.toISOString().split("T")[0];
  const dateTo = nextWeek.toISOString().split("T")[0];

  const res = await rateLimitedFetch(
    `${BASE_URL}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED`
  );

  if (res) {
    const data = await res.json();
    const matches = (data.matches || [])
      .filter((m: Record<string, unknown>) => {
        const comp = m.competition as Record<string, string> | undefined;
        return comp && codes.includes(comp.code || "");
      })
      .map((m: Record<string, unknown>) => parseMatch(m));
    setCache(cacheKey, matches, DEFAULT_TTL);
    return matches;
  }

  // Fallback: fetch per league
  for (const code of codes) {
    const matches = await getUpcomingMatches(code, maxPerLeague);
    allMatches.push(...matches);
  }

  setCache(cacheKey, allMatches, DEFAULT_TTL);
  return allMatches;
}

/**
 * Get live/in-play matches
 */
export async function getLiveMatches(): Promise<FootballMatch[]> {
  const cacheKey = "live_matches";
  const cached = getCached<FootballMatch[]>(cacheKey);
  if (cached) return cached;

  const res = await rateLimitedFetch(`${BASE_URL}/matches?status=IN_PLAY,PAUSED`);
  if (res) {
    const data = await res.json();
    const matches = (data.matches || []).map((m: Record<string, unknown>) => parseMatch(m));
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

  const today = dateFrom || new Date().toISOString().split("T")[0];
  const yesterday = dateTo || today;

  const res = await rateLimitedFetch(
    `${BASE_URL}/matches?dateFrom=${today}&dateTo=${yesterday}&status=FINISHED`
  );

  if (res) {
    const data = await res.json();
    const matches = (data.matches || []).map((m: Record<string, unknown>) => parseMatch(m));
    setCache(cacheKey, matches, 15 * 60 * 1000); // 15 min
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

  const res = await rateLimitedFetch(
    `${BASE_URL}/competitions/${league.id}/standings`
  );

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

    setCache(cacheKey, result, STANDINGS_TTL);
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

  const promises = codes.map(async (code) => {
    const s = await getStandings(code);
    return s;
  });

  const standings = await Promise.all(promises);
  for (const s of standings) {
    if (s) results.push(s);
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
    minute: (score.duration as string) || undefined,
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