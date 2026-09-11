# Why the API returns a league table but no matches

Investigation of "the API is not getting matches, but it gets the league's table",
what the code was doing, and what changed to fix it.

---

## TL;DR

The standings endpoint is a single request **without a status filter**, and the
standings *section* also ships a hardcoded sample table — so it always looks
healthy. The fixtures path is a **filtered** request (`status=SCHEDULED`) whose
result, when it comes back empty *or* fails for any reason, is silently replaced
by seed tips. Nothing was logged, so "no matches" could mean five very different
things. The filter was the bug; the silence was why it was invisible.

| | League table | Matches / tips |
| --- | --- | --- |
| Upstream call | `/v4/competitions/2021/standings` (no filter) | `/v4/matches?dateFrom=…&dateTo=…&status=SCHEDULED` |
| On failure | route → seed table, component → its own hardcoded table | route → DB tips → seed tips, no error surfaced |
| Result | always renders something that looks live | looks like "the API has no matches" |

---

## Evidence

**1. The fixtures query was the only filtered call in the app.**

```ts
// before
`${BASE_URL}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED`
`${BASE_URL}/competitions/${league.id}/matches?status=SCHEDULED&limit=${count}`
```

football-data.org's own docs (v4 status workflow) say a match is stamped
`SCHEDULED` while only a rough date is known and switches to **`TIMED`** as soon
as the exact kick-off date/time is confirmed. A `status=SCHEDULED` query
therefore returns *nothing* for fixtures whose kick-off time is already
published, while `/standings` (no filter) keeps answering normally — exactly the
reported symptom.

**2. `dateTo` is exclusive in v4.** The app's own database proves it: after a
fetch at `2026-09-06T23:54Z` the stored tips cover 09-07 → 09-12, and only after
the UTC date rolled over (`2026-09-07T00:02Z`) did the 09-13 fixtures appear.
The app asked for `today → today+7` and silently dropped the 7th day.

**3. The last successful live fetch was `2026-09-10T20:27Z`** (12 new `real_*`
tips, Primera Division / Premier League / Serie A, matches on 14–16 Sep) — so
the container *can* reach the API; this is not a permanent network problem.

**4. The key in `.env` is not the key the app sends.**

```
db/custom.db → AppSetting.football_api_key = 7508…eaaa   (saved 2026-07-31)
.env         → FOOTBALL_API_KEY           = 2f36…40e2   (edited 2026-09-11 03:25)
```

`getApiKey()` checks the database **first**, so the "Update FOOTBALL_API_KEY
format in .env" commit changed nothing at runtime. `GET /api/diagnostics/football`
now reports which source is live and warns when `.env` is shadowed.

**5. Every failure was collapsed into `null`,** and `getStandings()`/`getUpcomingMatches()`
cannot tell `null` from "200 with zero matches". On top of that:

* a failed *and* an empty result were cached for the full TTL (5 min), so one
  blip froze the seed fallback in place;
* `/api/tips` wrote the fetched tips to SQLite inside the route's only
  `try/catch` — one DB error (locked file, missing table) sent the route to the
  seed fallback even though the matches had been fetched successfully;
* `rateLimitedFetch` had no timeout, and the per-league fallback fired up to six
  6.1 s-spaced requests (~37 s) while the rate limiter also queues the standings
  request behind them.

**6. Environment check.** From this checkout's sandbox, `api.football-data.org`
is *unreachable* (TLS handshake reset) while `api.github.com`/`registry.npmjs.org`
work — an egress allowlist. If the app is served from an environment like that,
the fixture call and the standings call both fail and the UI will show seed data
for both (the table just happens to look convincing). Check #1 below settles it.

---

## What changed

`src/lib/football-api.ts`

* **No more `status=` filter on fixtures** — the date window is fetched and
  `SCHEDULED` + `TIMED` are kept locally (works on both statuses, no reliance on
  a comma-separated status filter).
* **Correct windows** — `dateTo = today + 8` (exclusive) for a full week, and
  `getFinishedMatches()` defaults to `today → tomorrow` instead of an empty range.
* **Failures are visible** — every upstream call is recorded (status, ms, error)
  and logged: `[football-api] 403 from … — The resource … is restricted`. The
  reason is exposed as `note` on the seed responses and as a UI tooltip.
* **No negative caching** — empty/failed results are not cached, so the board
  recovers on the next request instead of after the TTL.
* **Timeouts + bounded fallback** — `AbortSignal.timeout(15s)`; the per-league
  fallback stops early on network/auth failures and has a 25 s budget.
* **Rate-limit knob** — `FOOTBALL_API_MIN_INTERVAL_MS` (default 6100 ≈ free
  tier's 10 req/min) for paid plans.

Routes / UI

* `GET /api/diagnostics/football[?probe=1]` — key source, last upstream status,
  cache contents, problem list; `?probe=1` re-queries three endpoints live.
* `GET /api/settings/api-key` unchanged; `DELETE` it to un-shadow `.env`.
* `/api/tips` persists tips in its own `try/catch` and still returns live tips.
* `note` added to the seed responses of `/api/tips`, `/api/standings`,
  `/api/fixtures`, `/api/live-scores`.
* Standings + tips sections now show a **Live / Demo** badge (with the upstream
  reason in the tooltip) instead of silently rendering sample data.

Tests: `src/lib/football-api.test.ts` (10 cases — keeps `TIMED`, drops
`FINISHED`/`IN_PLAY`, sorts + limits, full week window, no negative caching, no
per-league hammering on an empty window, per-league fallback after a 403, key
reporting, 403 and network-error notes). Full suite: 50 tests pass, ESLint 0 errors.

---

## How to confirm in your environment

```bash
# 1. Can the container reach football-data.org and is the key accepted?
node scripts/football-api-check.mjs          # add --delay=0 to skip the pacing
#    (inside Docker: docker compose exec web bun scripts/football-api-check.mjs)

# 2. What does the app itself think?
curl -s localhost:3000/api/diagnostics/football | jq
curl -s "localhost:3000/api/diagnostics/football?probe=1" | jq '.problems, .probes'
```

How to read it:

| Output | Meaning | Action |
| --- | --- | --- |
| `key … : (none)` / `"source": "none"` | no key configured | set one, or expect seed data |
| `NO RESPONSE` / `status: null` | request never reached the API | fix container egress/DNS/TLS; nothing else helps |
| `HTTP 401/403` | bad key or plan missing the resource | rotate the key; check the plan |
| `HTTP 429` | free-tier limit (10 req/min) | the client now paces itself; raise `FOOTBALL_API_MIN_INTERVAL_MS` only on paid plans |
| `200` + `0 matches` | API fine, query matched nothing | was the `status=SCHEDULED` trap — now fixed |
| "⚠ The DB key shadows .env" | `.env` edit had no effect | `DELETE /api/settings/api-key` |

> Security note: `.env.example` used to ship a real-looking key; it is now a
> placeholder. `.env` (tracked in this repo) still contains the live key and the
> `AUTH_SECRET` — consider rotating both and keeping them out of version control.
