# GoalEdge — Smarter Football Predictions

A football prediction & betting tips platform built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS 4**, **shadcn/ui**, **Prisma Next + SQLite**, and **Framer Motion**.

## Features

- 🎯 **Daily tips** — featured predictions across 10+ leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1, NPFL…), with confidence scores, analysis, and premium (PRO) tips
- 📊 **Odds comparison** — per-bookmaker odds board (BetKing, 1xBet, SportyBet, Betway, 22Bet) with the best price highlighted and affiliate "Bet now" links (see [Affiliate links](#affiliate-links))
- 📈 **Track record** — public, data-driven results history (won/lost/void) with win rate, ROI, and accuracy trend — updated live as tips are settled
- 🧾 **Bet slips & bet placement** — singles through accumulators, Ksh stakes, auto-settlement when tips are resolved
- 🔗 **Shareable bet slips** — one click turns any slip into a public page at `/slip/abc123` with a copy-to-clipboard button and a "get today's tips" CTA
- 📱 **PWA** — installable on Android/iOS with offline app shell, standalone display, and home-screen icons
- 💰 **Bankroll tracker** — your profile shows real bet history, per-bet P&L, ROI and a cumulative P&L chart (recharts)
- 🎁 **Referral program** — every account has an invite code (`/?ref=CODE`); a referred signup grants the new user 2 free premium days, and the referrer earns 7 free premium days once their friend completes a first payment
- 🔐 **Accounts & premium** — signup/sign-in on the app's own session cookie (email + bcrypt password, no NextAuth), premium plans via **Paystack** (daily/weekly/monthly passes), API-key settings panel
- 🛡️ **Rate limiting** — in-memory per-IP limits on register, newsletter, bets, payments and password-reset endpoints
- ⚽ **Live scores & standings** — live data from football-data.org with graceful demo fallback
- 🎨 Dark/light mode, animations, fully responsive

## Tech stack

| Layer      | Choice                                             |
| ---------- | -------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack, standalone)     |
| Language   | TypeScript                                         |
| Styling    | Tailwind CSS 4 + shadcn/ui                         |
| Database   | SQLite via Prisma Next (`db/custom.db`)            |
| Auth       | Built-in: bcrypt passwords + signed HS256 session cookie ([details](#authentication)) |
| Payments   | Paystack (initialize / verify / webhook)           |
| Data       | football-data.org API (optional, with seed fallback) |
| Realtime   | socket.io odds service (`mini-services/odds-service`) |
| Animations | Framer Motion                                      |

## Getting started

```bash
# 1. Install dependencies
npm install          # or: bun install

# 2. Configure environment
cp .env.example .env # see Environment variables below

# 3. Set up the database
npx prisma generate
npm run db:push      # create tables (SQLite file: db/custom.db)
npm run db:seed      # seed upcoming + historical tips (idempotent)

# 4. Run
npm run dev          # http://localhost:3000
```

> **Bun note:** this project also ships a `bun.lock`. Either package manager works; `npm install` will create a `package-lock.json` (gitignored — `bun.lock` is the source of truth).

## Environment variables

| Variable                  | Required | Purpose                                                        |
| ------------------------- | -------- | -------------------------------------------------------------- |
| `DATABASE_URL`            | ✅       | SQLite path (default `file:./db/custom.db`; a non-`file:` URL is ignored — the app falls back to the bundled DB) |
| `PAYSTACK_SECRET_KEY`     | ❌       | Real Paystack charges; **absent = demo checkout**              |
| `NEXT_PUBLIC_PAYSTACK_KEY`| ❌       | Paystack inline popup in the browser (needs secret too)        |
| `FOOTBALL_API_KEY`        | ❌       | football-data.org key (or save it in Admin → API Key panel — **a saved key wins over this variable**) |
| `FOOTBALL_API_MIN_INTERVAL_MS` | ❌ | Pause between football-data.org calls (default `6100` ≈ free tier's 10 req/min; lower it on a paid plan) |
| `AFFILIATE_URL_TEMPLATE`  | ❌       | Tracked affiliate links for the odds comparison (see below)    |
| `AUTH_SECRET`             | ❌       | Signs the session cookie (a dev default is used if unset — set it in prod). The legacy `NEXTAUTH_SECRET` is still honoured, so existing sessions survive the upgrade |

## Scripts

| Script            | Description                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Dev server on port 3000                            |
| `npm run build`   | Production build (standalone output)               |
| `npm run start`   | Serve the standalone build (`bun .next/standalone/server.js`) |
| `npm run lint`    | ESLint                                             |
| `npm test`        | Vitest unit tests (`src/**/*.test.ts`)             |
| `npm run db:emit` | Compile `src/prisma/contract.prisma` → `contract.json` + `contract.d.ts` |
| `npm run db:verify` | Check the database against the contract        |
| `npm run db:push` | Apply contract changes to the database (`prisma db update`) |
| `npm run db:seed` | Seed tips (idempotent; needs Bun or Node ≥ 22.18)  |
| `npm run db:status` | Print CLI/contract/database/runtime status      |

## API routes

| Route                          | Purpose                                      |
| ------------------------------ | -------------------------------------------- |
| `GET /api/tips`                | Current tips (live → database → seed)        |
| `GET /api/odds`                | Per-bookmaker odds comparison + affiliate links |
| `GET /api/fixtures`            | Upcoming / finished fixtures                 |
| `GET /api/live-scores`         | Live scores                                  |
| `GET /api/standings?league=PL` | League standings                             |
| `GET /api/leagues`             | Competition list                             |
| `GET /api/performance`         | Stakes, returns, ROI from real bets          |
| `GET /api/admin/tips?history=true` | Settled tips (track record)              |
| `POST /api/admin/tips`         | Create tip (PATCH/DELETE also supported)     |
| `POST /api/slips`              | Create a shareable bet slip                 |
| `GET /api/slips/[slug]`        | Public slip data (rendered at `/slip/[slug]`) |
| `GET /api/referrals?email=`    | Referral code, stats & referral list        |
| `POST /api/referrals/validate` | Check a referral code before signup         |
| `POST /api/auth/register`      | Create account + sign in (rate-limited)     |
| `POST /api/auth/login`         | Sign in with email + password (rate-limited) |
| `GET /api/auth/session`        | Current user from the session cookie (`{ session: null }` for guests) |
| `POST /api/auth/logout`        | Sign out (expires the cookie)                |
| `POST /api/auth/reset-password`| Request password reset (stub — add mailer)   |
| `POST /api/newsletter`         | Newsletter signup                            |
| `POST /api/bets/place`         | Place a bet (auto-settled if tips resolved)  |
| `GET /api/bets/history`        | User bet history                             |
| `POST /api/payment/initiate`   | Start Paystack checkout (or demo)            |
| `POST /api/payment/verify`     | Verify a charge & activate premium           |
| `POST /api/payment/webhook`    | Paystack webhook (HMAC-verified)             |
| `GET /api/settings/api-key`    | Check football-data key status               |
| `GET /api/diagnostics/football`| Why live data is (not) showing up: key source, last upstream status/error, cache state. Add `?probe=1` to re-query football-data.org directly |

## Live data troubleshooting

Live fixtures/standings come from [football-data.org](https://www.football-data.org).
When a call fails the app **falls back to seed data** (and the standings section has a
hardcoded sample table), which used to make "no matches" impossible to debug. Now:

```bash
# 1. What the app knows: key source, last upstream status code, cache contents
curl -s localhost:3000/api/diagnostics/football | jq

# 2. Re-query football-data.org itself (3 calls, ~20s: free tier = 10 req/min)
curl -s "localhost:3000/api/diagnostics/football?probe=1" | jq '.problems, .probes'

# 3. Or straight from a shell (works even if the app won't boot)
node scripts/football-api-check.mjs          # add --delay=0 to go faster
```

Reading the result:

| Symptom | Meaning |
| ------- | ------- |
| `"source": "none"` | no key configured — everything is seed data |
| status `null` | the request never reached the API (Docker network, blocked egress, DNS, TLS) |
| `401` / `403` | invalid key, or the plan does not cover that resource |
| `429` | free-tier rate limit (10 requests/minute) — the app waits 60s and retries once |
| `200` but `0` items | the API answered fine, that query just matched nothing (wrong status filter / date window) |

Two gotchas that bit this app:

1. **A key saved in the DB shadows `.env`.** `getApiKey()` reads `AppSetting.football_api_key`
   first, so editing `FOOTBALL_API_KEY` has no effect while a key is stored in the app —
   remove it with `DELETE /api/settings/api-key` (or Admin → API Key) to fall back to `.env`.
2. **`status=SCHEDULED` hides fixtures.** football-data.org switches a match from
   `SCHEDULED` to `TIMED` as soon as its kick-off time is confirmed, and v4 treats
   `dateTo` as *exclusive*. The client now requests a date window with no status filter
   and keeps `SCHEDULED` + `TIMED` locally.

## Prisma troubleshooting (Prisma Next / Prisma 8)

GoalEdge runs **Prisma Next** — the Prisma 8 line, currently `8.0.0-rc.13` — against SQLite. There is
no generated client and no `prisma generate` / `prisma db push` any more; the contract in
`src/prisma/contract.prisma` is compiled into `contract.json` + `contract.d.ts` and the app queries
through `@prisma/orm-sqlite` (driver: Node's built-in `node:sqlite`).

```bash
npm run db:status        # CLI, contract artefacts, database file, runtime
npm run db:emit          # after editing src/prisma/contract.prisma
npm run db:seed          # idempotent; runs under bun or node
```

| Symptom | Meaning / fix |
| ------- | ------------- |
| `Cannot find module 'node:sqlite'` | the runtime is older than Node 22.5 / a bun without `node:sqlite` (verified on bun 1.4.2) |
| `prisma contract emit` fails with `CONTRACT.SOURCE_LOAD_FAILED` | a PSL feature the SQLite target does not support — see the diagnostics it prints (no `Boolean`, no `@default(cuid())`, no `@updatedAt`) |
| `prisma db verify` reports `Marker missing` / schema differences | the shipped `db/custom.db` was created by the old Prisma 7 schema, so timestamp column affinity and auto-index names differ. Queries are unaffected — the app does not need the marker |
| `db update` / `db init` | apply contract changes to the database (there is no `db push`); back up `db/custom.db` first |
| API returns `isPremium: 0/1` instead of `true/false` | SQLite has no `Boolean` type — the contract stores `Int` and the routes map it at the boundary (see `src/app/api/tips/route.ts`) |
| `DATABASE_URL` warning on every query | set `DATABASE_URL="file:./db/custom.db"` — a Postgres URL cannot work with the SQLite target |

The compiled contract is committed so the app boots with no CLI step at all; re-run `npm run db:emit`
and commit the two artefacts whenever the contract changes.

## Authentication

GoalEdge owns its auth — there is **no NextAuth** (or any other auth library) in
the dependency tree. Passwords are hashed with `bcryptjs` (cost 12) and the
session is a signed **HS256 JWT** kept in an HttpOnly cookie.

```
POST /api/auth/login      { email, password }  → 200 { session } + Set-Cookie: goaledge.session
POST /api/auth/register   { name, email, password, referralCode? } → 201 + Set-Cookie (auto sign-in)
GET  /api/auth/session                         → 200 { session: { user, expires } | null }
POST /api/auth/logout                          → 200 + expired cookie
```

**Cookie** — `goaledge.session`, `HttpOnly`, `SameSite=Lax`, `Path=/`,
`Max-Age=2592000` (30 days), and `Secure` whenever the request arrives over
HTTPS (including behind a proxy that sets `X-Forwarded-Proto`). The client can
never read the token; it asks `/api/auth/session` for the user object.

**Server** — `src/lib/session-token.ts` signs and verifies tokens with the Web
Crypto API (`AUTH_SECRET`, falling back to the legacy `NEXTAUTH_SECRET`);
`src/lib/auth.ts` adds the password, cookie and user helpers:

```ts
import { getSessionUser, resolveRequestEmail } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);        // SessionUser | null
  const email = await resolveRequestEmail(request, request.nextUrl.searchParams.get("email"));
  // …
}
```

The token is verified and the user is then re-read from the database, so plan
changes (a premium purchase, a referral bonus, an admin downgrade) show up on
the next request instead of waiting for the token to expire — and a deleted
account is signed out immediately. `resolveRequestEmail()` makes a signed-in
session authoritative over any `?email=`/body email, so one account cannot read
another account's bets or payments; signed-out visitors still fall back to the
email they supply, which the guest/demo flows rely on.

**Client** — `src/lib/session-context.tsx` provides the session (fetched on
mount and refreshed when the tab regains focus):

```tsx
import { useAuth, useSession } from "@/lib/session-context";

const { data: session } = useSession();          // next-auth-compatible shape
const { signIn, signUp, signOut } = useAuth();   // plain fetch, no page reload

const result = await signIn(email, password);    // { ok, error?, session? }
if (result.ok) closeModal();
```

Emails are stored lowercase and looked up case-insensitively, so `Foo@Bar.com`
and `foo@bar.com` are the same account (older mixed-case rows keep their stored
casing, which other tables reference).

## Payment modes

- **Demo mode** (no `PAYSTACK_SECRET_KEY`): checkout is simulated — the modal auto-verifies after 2 seconds and premium activates. Good for testing the full flow.
- **Live mode** (keys set): real Paystack `initialize`/`verify` calls, the Paystack inline popup in the browser, and HMAC-SHA512 webhook signature verification.

Amounts are Ksh; Paystack expects them in cents (`amount * 100`, currency `KES`).

## Odds comparison & affiliate links

Each tip shows a per-bookmaker odds board (`GET /api/odds`). By default, bookmaker buttons link to their sites with `?ref=goaledge`. To use real tracked affiliate links, set:

```
AFFILIATE_URL_TEMPLATE=https://track.your-affiliate.com/?a=123&m={bookmaker}&o={odds}&h={home}&a2={away}
```

Placeholders: `{bookmaker}` `{odds}` `{home}` `{away}` `{prediction}`.

## Referral program

- Every user gets a unique 6-char invite code (auto-generated at signup; existing users get one via `npm run db:seed` or on first visit to the Referrals tab).
- Share your link (`https://yoursite.com/?ref=CODE`) — it opens the signup form with the code prefilled and validated live.
- **Referee benefit:** 2 free premium days at signup (zero-amount `referral_bonus` payment).
- **Referrer benefit:** 7 free premium days per referred friend who completes their first payment (zero-amount `referral_reward` payment, extending from the referrer's current expiry — never shortens an active subscription).
- Rewards are idempotent: one reward per referred user (pending → rewarded), enforced in `src/lib/referrals.ts` and covered by unit tests.
- Management UI lives in Profile → Referrals (link + copy button, stats, referral list with statuses).

## Rate limiting

Sensitive endpoints (registration, password reset, newsletter, bet placement, payment initiation, slip sharing) are protected by an in-memory sliding-window limiter (`src/lib/rate-limit.ts`) keyed by IP. Exceeding the limit returns `429` with `Retry-After`. For multi-instance deployments, swap the map for a Redis-backed limiter.

## PWA

The app is installable: `src/app/manifest.ts` (manifest), `public/sw.js` (offline app shell + static caching), and icons in `public/icons/` (generated from `public/favicon.svg` with sharp). The service worker only registers in production builds. Add `https://` hosting for full installability on iOS.

## Tests & CI

Unit tests live next to the code (`src/lib/*.test.ts`) and run with Vitest (`npm test`). The GitHub Actions workflow (`.github/workflows/ci.yml`) runs install → prisma generate/validate → lint → test → build on every push and PR.

## Tip settlement

Marking a tip **won / lost / void** in the Admin Dashboard (`/api/admin/tips` PATCH) automatically settles every pending bet slip containing that tip:

- any leg lost → bet **lost**
- all legs won → bet **won**
- all legs void → bet **void**; won + void mix → **partial**
- any leg still pending → stays **pending** (per-leg results updated)

Bets placed on already-settled tips resolve immediately.

## Odds service (optional)

`mini-services/odds-service` is a standalone socket.io server that streams live odds movements (BetKing, 1xBet, SportyBet, Betway, 22Bet). Run it on port 3004 and the site connects to it via the Caddy `XTransformPort` proxy:

```bash
cd mini-services/odds-service && bun install && bun start
```

The site degrades gracefully when the service is offline.

## Deployment

The build produces a self-contained standalone output:

```bash
npm run build        # .next/standalone + static + public
npm run start        # serves on port 3000
```

Any Node 18+ host works (VPS, Railway, Render, Fly.io…). The `Caddyfile` in the repo proxies port 3000 and forwards `XTransformPort` websocket ports (e.g. the 3004 odds service). For production, switch `DATABASE_URL` to a shared volume-backed SQLite file (or move to a Postgres deployment with Prisma Next's Postgres target).

## Project structure

```
src/
  app/
    page.tsx              # Landing page (all sections + modals)
    api/                  # Route handlers (see table above)
    layout.tsx            # Fonts, theme, session provider, metadata
  components/
    goaledge/             # Site components (Header, TipCard, sections…)
    goaledge/modals/      # AuthModal, AdminPanel, OddsCompareModal, …
    ui/                   # shadcn/ui primitives
  lib/
    football-api.ts       # football-data.org client + seed data
    odds-comparison.ts    # Bookmaker odds board + affiliate links
    bet-settlement.ts     # Auto-settlement of bet slips
    auth.ts               # Server auth: passwords, session cookie, current user
    session-token.ts      # HS256 sign/verify for the session token (Web Crypto)
    session-context.tsx   # Client SessionProvider + useSession()/useAuth()
  types/goaledge.ts       # Shared types
mini-services/odds-service # socket.io live odds streamer
examples/websocket/        # Minimal socket.io chat example
prisma/seed.mjs            # Database seed (npm run db:seed)
```

## Disclaimer

GoalEdge is for **18+ users only**. Gambling involves risk — bet responsibly. Odds shown are indicative market prices; GoalEdge may earn commissions on affiliate links without changing the price you see.
