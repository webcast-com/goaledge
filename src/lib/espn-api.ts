import type { FootballMatch } from "@/lib/football-api";

const ESPN_SITE_API = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const SCOREBOARD_LIMIT = 100;
const DEFAULT_TTL_MS = 2 * 60 * 1000;
const LIVE_TTL_MS = 30 * 1000;
const MAX_DATE_RANGE_DAYS = 31;
const MAX_CACHED_SCOREBOARDS = 200;
const FETCH_TIMEOUT_MS = 10_000;

export interface EspnLeague {
  code: string;
  slug: string;
  name: string;
  country: string;
  flag: string;
}

export const ESPN_LEAGUES: EspnLeague[] = [
  { code: "PL", slug: "eng.1", name: "Premier League", country: "England", flag: "🦁" },
  { code: "PD", slug: "esp.1", name: "La Liga", country: "Spain", flag: "🇪🇸" },
  { code: "BL1", slug: "ger.1", name: "Bundesliga", country: "Germany", flag: "🇩🇪" },
  { code: "SA", slug: "ita.1", name: "Serie A", country: "Italy", flag: "🇮🇹" },
  { code: "FL1", slug: "fra.1", name: "Ligue 1", country: "France", flag: "🇫🇷" },
  { code: "CL", slug: "uefa.champions", name: "UEFA Champions League", country: "Europe", flag: "🏆" },
  { code: "EL", slug: "uefa.europa", name: "UEFA Europa League", country: "Europe", flag: "🇪🇺" },
  { code: "EC", slug: "uefa.euro", name: "UEFA European Championship", country: "Europe", flag: "🌍" },
  { code: "WC", slug: "fifa.world", name: "FIFA World Cup", country: "World", flag: "🌎" },
  { code: "PPL", slug: "por.1", name: "Primeira Liga", country: "Portugal", flag: "🇵🇹" },
  { code: "DED", slug: "ned.1", name: "Eredivisie", country: "Netherlands", flag: "🇳🇱" },
  { code: "BSA", slug: "bra.1", name: "Brasileirão Série A", country: "Brazil", flag: "🇧🇷" },
  { code: "RSA", slug: "rsa.1", name: "South African Premier Division", country: "South Africa", flag: "🇿🇦" },
];

const DEFAULT_LEAGUE_CODES = ["PL", "PD", "BL1", "SA", "FL1", "CL"];
const LEAGUE_BY_ALIAS = new Map<string, EspnLeague>();
for (const league of ESPN_LEAGUES) {
  LEAGUE_BY_ALIAS.set(league.code.toLowerCase(), league);
  LEAGUE_BY_ALIAS.set(league.slug.toLowerCase(), league);
}

export type EspnGameFilter = "all" | "upcoming" | "live" | "finished";

export interface EspnGamesOptions {
  /** GoalEdge league code (PL) or ESPN league slug (eng.1). Omit for the default leagues. */
  league?: string;
  /** One UTC calendar day in YYYY-MM-DD format. Defaults to today. */
  date?: string;
  /** Inclusive start of a date range. Must be supplied with dateTo. */
  dateFrom?: string;
  /** Inclusive end of a date range. Must be supplied with dateFrom. */
  dateTo?: string;
  status?: EspnGameFilter;
  limit?: number;
}

interface ScoreboardCacheEntry {
  games: FootballMatch[];
  expiresAt: number;
}

const scoreboardCache = new Map<string, ScoreboardCacheEntry>();
const inFlightRequests = new Map<string, Promise<FootballMatch[]>>();

/** Public ESPN scoreboard data does not require an API key. */
export async function getEspnGames(options: EspnGamesOptions = {}): Promise<FootballMatch[]> {
  const league = options.league ? getEspnLeague(options.league) : undefined;
  if (options.league && !league) {
    throw new RangeError(`Unsupported ESPN league: ${options.league}`);
  }

  const dateQuery = getDateQuery(options);
  const status = options.status ?? "all";
  if (!["all", "upcoming", "live", "finished"].includes(status)) {
    throw new RangeError(`Unsupported game status: ${status}`);
  }

  const requestedLimit = options.limit ?? SCOREBOARD_LIMIT;
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > SCOREBOARD_LIMIT) {
    throw new RangeError(`limit must be an integer between 1 and ${SCOREBOARD_LIMIT}`);
  }

  const leagues = league
    ? [league]
    : DEFAULT_LEAGUE_CODES.map((code) => getEspnLeague(code)!).filter(Boolean);
  const settled = await Promise.allSettled(
    leagues.map((entry) => getLeagueScoreboard(entry, dateQuery))
  );

  const successfulResults = settled.filter(
    (result): result is PromiseFulfilledResult<FootballMatch[]> => result.status === "fulfilled"
  );
  if (successfulResults.length === 0) {
    const errors = settled
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => (result.reason instanceof Error ? result.reason.message : String(result.reason)));
    throw new Error(`ESPN scoreboard requests failed${errors.length ? `: ${errors.join("; ")}` : ""}`);
  }

  const uniqueGames = new Map<number, FootballMatch>();
  for (const result of successfulResults) {
    for (const game of result.value) uniqueGames.set(game.id, game);
  }

  return [...uniqueGames.values()]
    .filter((game) => matchesStatus(game.status, status))
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate))
    .slice(0, requestedLimit);
}

/** Get upcoming ESPN fixtures over today and the requested number of days ahead. */
export async function getEspnUpcomingGames(
  options: Omit<EspnGamesOptions, "date" | "dateFrom" | "dateTo" | "status"> & {
    daysAhead?: number;
  } = {}
): Promise<FootballMatch[]> {
  const { dateFrom, dateTo } = getEspnDateWindow(options.daysAhead ?? 7);

  return getEspnGames({
    league: options.league,
    dateFrom,
    dateTo,
    status: "upcoming",
    limit: options.limit,
  });
}

export function getEspnDateWindow(daysAhead = 7): { dateFrom: string; dateTo: string } {
  if (!Number.isInteger(daysAhead) || daysAhead < 0 || daysAhead > MAX_DATE_RANGE_DAYS) {
    throw new RangeError(`daysAhead must be an integer between 0 and ${MAX_DATE_RANGE_DAYS}`);
  }
  const dateFrom = new Date().toISOString().slice(0, 10);
  const dateToValue = new Date(`${dateFrom}T00:00:00.000Z`);
  dateToValue.setUTCDate(dateToValue.getUTCDate() + daysAhead);
  return { dateFrom, dateTo: dateToValue.toISOString().slice(0, 10) };
}

export function getEspnLeague(value: string): EspnLeague | undefined {
  return LEAGUE_BY_ALIAS.get(value.trim().toLowerCase());
}

export function getEspnLeagues(): EspnLeague[] {
  return ESPN_LEAGUES.map((league) => ({ ...league }));
}

/** Clear memoized scoreboard data (also useful for isolated tests). */
export function clearEspnCache(): void {
  scoreboardCache.clear();
  inFlightRequests.clear();
}

function getDateQuery(options: EspnGamesOptions): string {
  const hasFrom = Boolean(options.dateFrom);
  const hasTo = Boolean(options.dateTo);
  if (hasFrom !== hasTo) {
    throw new RangeError("dateFrom and dateTo must be supplied together");
  }
  if (options.date && (hasFrom || hasTo)) {
    throw new RangeError("Use either date or dateFrom/dateTo, not both");
  }

  if (hasFrom && hasTo) {
    const from = compactDate(options.dateFrom!);
    const to = compactDate(options.dateTo!);
    const fromMs = Date.parse(`${options.dateFrom}T00:00:00.000Z`);
    const toMs = Date.parse(`${options.dateTo}T00:00:00.000Z`);
    if (toMs < fromMs) throw new RangeError("dateTo must be on or after dateFrom");
    if (toMs - fromMs > MAX_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000) {
      throw new RangeError(`Date ranges cannot exceed ${MAX_DATE_RANGE_DAYS} days`);
    }
    return `${from}-${to}`;
  }

  return compactDate(options.date ?? new Date().toISOString().slice(0, 10));
}

function compactDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError("Dates must use YYYY-MM-DD format");
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new RangeError(`Invalid calendar date: ${value}`);
  }
  return value.replaceAll("-", "");
}

async function getLeagueScoreboard(
  league: EspnLeague,
  dateQuery: string
): Promise<FootballMatch[]> {
  const cacheKey = `${league.slug}:${dateQuery}`;
  const cached = scoreboardCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.games.map((game) => ({ ...game }));
  if (cached) scoreboardCache.delete(cacheKey);

  const pending = inFlightRequests.get(cacheKey);
  if (pending) return (await pending).map((game) => ({ ...game }));

  const request = (async () => {
    const url = `${ESPN_SITE_API}/${encodeURIComponent(league.slug)}/scoreboard?${new URLSearchParams({
      dates: dateQuery,
      limit: String(SCOREBOARD_LIMIT),
    })}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`ESPN returned HTTP ${response.status} for ${league.slug}`);
    }

    const data = asRecord(await response.json());
    const leagues = asRecords(data.leagues);
    const leagueInfo = leagues[0] ?? {};
    const competitionName = getString(leagueInfo.name) || league.name;
    const competitionEmblem = getLogo(leagueInfo.logos);
    const games = asRecords(data.events)
      .map((event) => parseEvent(event, league, competitionName, competitionEmblem))
      .filter((game): game is FootballMatch => game !== null);
    const ttl = games.some((game) => game.status === "IN_PLAY" || game.status === "PAUSED")
      ? LIVE_TTL_MS
      : DEFAULT_TTL_MS;
    cacheScoreboard(cacheKey, games, ttl);
    return games;
  })();

  inFlightRequests.set(cacheKey, request);
  try {
    return (await request).map((game) => ({ ...game }));
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

function cacheScoreboard(key: string, games: FootballMatch[], ttl: number): void {
  const now = Date.now();
  for (const [cachedKey, entry] of scoreboardCache) {
    if (entry.expiresAt <= now) scoreboardCache.delete(cachedKey);
  }
  if (!scoreboardCache.has(key) && scoreboardCache.size >= MAX_CACHED_SCOREBOARDS) {
    const oldestKey = scoreboardCache.keys().next().value;
    if (oldestKey) scoreboardCache.delete(oldestKey);
  }
  scoreboardCache.set(key, {
    games: games.map((game) => ({ ...game })),
    expiresAt: now + ttl,
  });
}

function parseEvent(
  event: Record<string, unknown>,
  league: EspnLeague,
  competitionName: string,
  competitionEmblem: string
): FootballMatch | null {
  const eventDate = getString(event.date);
  if (!eventDate || !Number.isFinite(Date.parse(eventDate))) return null;

  const competition = asRecords(event.competitions)[0] ?? {};
  const competitors = asRecords(competition.competitors);
  if (competitors.length < 2) return null;

  const home = competitors.find((competitor) => getString(competitor.homeAway).toLowerCase() === "home")
    ?? competitors[0];
  const away = competitors.find((competitor) => getString(competitor.homeAway).toLowerCase() === "away")
    ?? competitors.find((competitor) => competitor !== home)
    ?? competitors[1];
  const homeTeam = asRecord(home.team);
  const awayTeam = asRecord(away.team);
  const statusInfo = asRecord(competition.status);
  const eventStatus = Object.keys(statusInfo).length > 0 ? statusInfo : asRecord(event.status);
  const statusType = asRecord(eventStatus.type);
  const status = normalizeStatus(eventStatus, statusType);
  const parsedId = numericId(event.id ?? event.uid ?? event.name);
  const eventLeague = asRecords(event.leagues)[0] ?? {};

  return {
    id: parsedId,
    utcDate: eventDate,
    status,
    matchday: getNumber(asRecord(event.week).number) ?? getNumber(asRecord(competition.week).number) ?? 0,
    homeTeam: getString(homeTeam.displayName) || getString(homeTeam.name) || "Home team",
    awayTeam: getString(awayTeam.displayName) || getString(awayTeam.name) || "Away team",
    homeTeamCrest: getLogo(homeTeam.logos) || getString(homeTeam.logo),
    awayTeamCrest: getLogo(awayTeam.logos) || getString(awayTeam.logo),
    homeScore: parseScore(home.score),
    awayScore: parseScore(away.score),
    competition: getString(eventLeague.name) || competitionName,
    competitionEmblem: getLogo(eventLeague.logos) || competitionEmblem,
    competitionCode: league.code,
    minute: parseMinute(getString(eventStatus.displayClock) || getString(statusType.shortDetail)),
  };
}

function normalizeStatus(
  statusInfo: Record<string, unknown>,
  statusType: Record<string, unknown>
): string {
  const state = getString(statusType.state).toLowerCase();
  const description = [
    statusType.name,
    statusType.description,
    statusType.detail,
    statusType.shortDetail,
  ]
    .map(getString)
    .join(" ")
    .toLowerCase();

  if (description.includes("postpon")) return "POSTPONED";
  if (description.includes("cancel") || description.includes("abandon")) return "CANCELED";
  if (description.includes("suspend")) return "SUSPENDED";
  if (description.includes("delay")) return "DELAYED";
  if (state === "in" && /half|halftime|half-time|break/.test(description)) return "PAUSED";
  if (state === "in") return "IN_PLAY";
  if (statusType.completed === true || state === "post") return "FINISHED";
  if (state === "pre") return "TIMED";
  if (description.includes("final")) return "FINISHED";
  if (statusInfo.displayClock) return "IN_PLAY";
  return "SCHEDULED";
}

function matchesStatus(status: string, filter: EspnGameFilter): boolean {
  if (filter === "all") return true;
  if (filter === "live") return status === "IN_PLAY" || status === "PAUSED";
  if (filter === "finished") return status === "FINISHED";
  return status === "SCHEDULED" || status === "TIMED" || status === "DELAYED";
}

function parseScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !/^\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function parseMinute(value: string): number | undefined {
  const match = value.match(/\d+/);
  if (!match) return undefined;
  const minute = Number(match[0]);
  return Number.isFinite(minute) ? minute : undefined;
}

function numericId(value: unknown): number {
  const text = String(value ?? "");
  const parsed = Number(text);
  if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;

  // ESPN event IDs are normally numeric. Keep unusual IDs deterministic for the
  // app's numeric match ID contract without exposing or persisting raw payloads.
  let hash = 2_166_136_261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) || 1;
}

function getLogo(value: unknown): string {
  const logos = asRecords(value);
  const preferred = logos.find((logo) => asStrings(logo.rel).includes("default")) ?? logos[0];
  return preferred ? getString(preferred.href) : "";
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function asRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
