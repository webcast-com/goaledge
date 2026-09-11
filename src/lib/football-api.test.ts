import { beforeEach, describe, expect, it, vi } from "vitest";

// The DB is only used to look up a stored API key — no key here, so the library
// must fall back to FOOTBALL_API_KEY from the environment.
vi.mock("@/lib/db", () => ({
  db: { appSetting: { findUnique: async () => null } },
}));

process.env.FOOTBALL_API_KEY = "test-key-1234";
process.env.FOOTBALL_API_MIN_INTERVAL_MS = "0"; // don't wait 6s between calls in tests

const {
  getUpcomingMatches,
  getAllUpcomingMatches,
  getApiKeyInfo,
  getUpstreamNote,
  getUpstreamAttempts,
} = await import("@/lib/football-api");

type FetchMock = ReturnType<typeof vi.fn>;

function match(overrides: Record<string, unknown> = {}) {
  return {
    id: 555001,
    utcDate: "2026-09-14T18:00:00Z",
    status: "TIMED",
    matchday: 4,
    homeTeam: { name: "Home FC", crest: "h.svg" },
    awayTeam: { name: "Away FC", crest: "a.svg" },
    competition: { name: "Primera Division", code: "PD", emblem: "c.svg" },
    score: { fullTime: { home: null, away: null } },
    ...overrides,
  };
}

function mockFetch(status: number, body: unknown): FetchMock {
  const impl = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", impl);
  return impl as unknown as FetchMock;
}

function requestedUrl(mock: FetchMock, call = 0): string {
  return String(mock.mock.calls[call]?.[0]);
}

describe("football-api — upcoming fixtures", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps TIMED fixtures (kick-off time confirmed) and sends no status filter", async () => {
    const fetchMock = mockFetch(200, { matches: [match()] });

    const matches = await getUpcomingMatches("PD", 7);

    expect(matches).toHaveLength(1);
    expect(matches[0].status).toBe("TIMED");
    expect(matches[0].homeTeam).toBe("Home FC");
    expect(requestedUrl(fetchMock)).not.toContain("status=");
  });

  it("drops fixtures that already kicked off or finished", async () => {
    mockFetch(200, {
      matches: [
        match({ id: 1, status: "TIMED" }),
        match({ id: 2, status: "FINISHED" }),
        match({ id: 3, status: "IN_PLAY" }),
        match({ id: 4, status: "POSTPONED" }),
      ],
    });

    const matches = await getUpcomingMatches("SA", 9);

    expect(matches.map((m) => m.id)).toEqual([1]);
  });

  it("sorts by kick-off and respects the count limit", async () => {
    mockFetch(200, {
      matches: [
        match({ id: 1, utcDate: "2026-09-16T18:00:00Z" }),
        match({ id: 2, utcDate: "2026-09-14T18:00:00Z" }),
        match({ id: 3, utcDate: "2026-09-15T18:00:00Z" }),
      ],
    });

    const matches = await getUpcomingMatches("BL1", 2);

    expect(matches.map((m) => m.id)).toEqual([2, 3]);
  });

  it("asks for a full week (dateTo is exclusive in v4)", async () => {
    const fetchMock = mockFetch(200, { matches: [] });
    const isoDay = (offset: number) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + offset);
      return d.toISOString().split("T")[0];
    };

    await getUpcomingMatches("FL1", 3);

    const url = requestedUrl(fetchMock);
    expect(url).toContain(`dateFrom=${isoDay(0)}`);
    expect(url).toContain(`dateTo=${isoDay(8)}`);
  });

  it("does not cache an empty result, so the board recovers as soon as fixtures appear", async () => {
    mockFetch(200, { matches: [] });
    expect(await getUpcomingMatches("CL", 4)).toEqual([]);

    const fetchMock = mockFetch(200, { matches: [match({ status: "SCHEDULED" })] });
    const matches = await getUpcomingMatches("CL", 4);

    expect(matches).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("football-api — all-matches board", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not fire per-league requests when the window is genuinely empty", async () => {
    const fetchMock = mockFetch(200, { matches: [] });

    expect(await getAllUpcomingMatches(31)).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to per-league fixtures when the cross-competition endpoint is forbidden", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (/\/v4\/competitions\/2021\/matches/.test(url)) {
        return new Response(JSON.stringify({ matches: [match()] }), { status: 200 });
      }
      return new Response(JSON.stringify({ message: "restricted", errorCode: 403 }), { status: 403 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const matches = await getAllUpcomingMatches(32);

    expect(matches).toHaveLength(1);
    expect(matches[0].competitionCode).toBe("PD");
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });
});

describe("football-api — diagnostics", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports which key is in use without leaking it", async () => {
    mockFetch(200, { matches: [] });
    await getUpcomingMatches("PD", 11); // force the key to be resolved
    const info = getApiKeyInfo();

    expect(info.source).toBe("env");
    expect(info.configured).toBe(true);
    expect(info.suffix).toBe("1234");
    expect(info.envShadowed).toBe(false);
  });

  it("explains an HTTP error (403: plan does not cover the resource)", async () => {
    mockFetch(403, {
      message: "The resource you are looking for is restricted and apparently not within your permissions.",
      errorCode: 403,
    });

    expect(await getUpcomingMatches("PD", 12)).toEqual([]);
    expect(getUpstreamNote()).toContain("HTTP 403");
    expect(getUpstreamNote()).toContain("restricted");

    const last = getUpstreamAttempts().at(-1);
    expect(last?.status).toBe(403);
    expect(last?.ok).toBe(false);
  });

  it("explains a network failure (request never reached the API)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed", { cause: new Error("connect ECONNREFUSED") });
      }),
    );

    expect(await getUpcomingMatches("PD", 13)).toEqual([]);
    expect(getUpstreamNote()).toContain("network error");
    expect(getUpstreamNote()).toContain("ECONNREFUSED");

    const last = getUpstreamAttempts().at(-1);
    expect(last?.status).toBeNull();
  });
});
