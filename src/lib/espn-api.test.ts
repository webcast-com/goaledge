import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearEspnCache,
  getEspnGames,
  getEspnLeague,
  getEspnLeagues,
} from "@/lib/espn-api";

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "12345",
    date: "2026-10-01T18:00:00Z",
    week: { number: 7 },
    competitions: [
      {
        competitors: [
          {
            homeAway: "away",
            score: "2",
            team: { displayName: "Manchester City", logos: [{ href: "https://img.test/city.png" }] },
          },
          {
            homeAway: "home",
            score: "1",
            team: { displayName: "Arsenal", logos: [{ href: "https://img.test/arsenal.png" }] },
          },
        ],
        status: {
          displayClock: "78:12",
          type: {
            name: "STATUS_IN_PROGRESS",
            state: "in",
            description: "In Progress",
            completed: false,
          },
        },
      },
    ],
    ...overrides,
  };
}

function mockScoreboard(events: Record<string, unknown>[]) {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
    new Response(
      JSON.stringify({
        leagues: [{ name: "English Premier League", logos: [{ href: "https://img.test/pl.png" }] }],
        events,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("ESPN soccer scoreboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearEspnCache();
  });

  it("maps ESPN scoreboard events and filters to live games", async () => {
    const fetchMock = mockScoreboard([
      event(),
      event({
        id: "12346",
        competitions: [
          {
            competitors: [
              { homeAway: "home", score: "0", team: { displayName: "Home FC" } },
              { homeAway: "away", score: "0", team: { displayName: "Away FC" } },
            ],
            status: {
              type: { name: "STATUS_SCHEDULED", state: "pre", completed: false },
            },
          },
        ],
      }),
    ]);

    const games = await getEspnGames({
      league: "PL",
      date: "2026-10-01",
      status: "live",
    });

    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({
      id: 12345,
      utcDate: "2026-10-01T18:00:00Z",
      status: "IN_PLAY",
      homeTeam: "Arsenal",
      awayTeam: "Manchester City",
      homeScore: 1,
      awayScore: 2,
      homeTeamCrest: "https://img.test/arsenal.png",
      awayTeamCrest: "https://img.test/city.png",
      competitionCode: "PL",
    });
    expect(games[0].minute).toBe(78);

    const requestedUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestedUrl.pathname).toBe("/apis/site/v2/sports/soccer/eng.1/scoreboard");
    expect(requestedUrl.searchParams.get("dates")).toBe("20261001");
  });

  it("maps scheduled, halftime, and final status values", async () => {
    mockScoreboard([
      event({
        id: "20001",
        competitions: [
          {
            competitors: [
              { homeAway: "home", score: "0", team: { displayName: "Home FC" } },
              { homeAway: "away", score: "0", team: { displayName: "Away FC" } },
            ],
            status: {
              displayClock: "HT",
              type: { name: "STATUS_HALFTIME", state: "in", description: "Halftime" },
            },
          },
        ],
      }),
      event({
        id: "20002",
        competitions: [
          {
            competitors: [
              { homeAway: "home", score: "3", team: { displayName: "Home FC" } },
              { homeAway: "away", score: "1", team: { displayName: "Away FC" } },
            ],
            status: {
              type: { name: "STATUS_FINAL", state: "post", completed: true },
            },
          },
        ],
      }),
    ]);

    const games = await getEspnGames({ league: "eng.1", date: "2026-10-01" });

    expect(games.map((game) => game.status)).toEqual(["PAUSED", "FINISHED"]);
    expect(games[0].minute).toBeUndefined();
    expect(games[1].homeScore).toBe(3);
  });

  it("accepts ESPN league slugs and returns a stable league catalog", () => {
    expect(getEspnLeague("eng.1")).toMatchObject({ code: "PL", slug: "eng.1" });
    expect(getEspnLeagues()).toHaveLength(13);
    expect(getEspnLeagues()[0]).toMatchObject({ code: "PL", slug: "eng.1" });
  });

  it("rejects unknown leagues, invalid dates, and unsupported ranges", async () => {
    await expect(getEspnGames({ league: "not-a-league" })).rejects.toThrow("Unsupported ESPN league");
    await expect(getEspnGames({ date: "2026-02-30" })).rejects.toThrow("Invalid calendar date");
    await expect(
      getEspnGames({ dateFrom: "2026-01-01", dateTo: "2026-03-01" }),
    ).rejects.toThrow("cannot exceed");
  });

  it("throws when every ESPN request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("unavailable", { status: 503 })),
    );

    await expect(getEspnGames({ league: "PL", date: "2026-10-01" })).rejects.toThrow("HTTP 503");
  });
});
