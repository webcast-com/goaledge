# GoalEdge — Smarter Football Predictions

A football prediction & betting tips platform built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS 4**, **shadcn/ui**, **Prisma + SQLite**, and **Framer Motion**.

## Features

- 🎯 **Daily tips** — featured predictions across 10+ leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1, NPFL…), with confidence scores, analysis, and premium (PRO) tips
- 📊 **Odds comparison** — per-bookmaker odds board (BetKing, 1xBet, SportyBet, Betway, 22Bet) with the best price highlighted and affiliate "Bet now" links (see [Affiliate links](#affiliate-links))
- 📈 **Track record** — public, data-driven results history (won/lost/void) with win rate, ROI, and accuracy trend — updated live as tips are settled
- 🧾 **Bet slips & bet placement** — singles through accumulators, Ksh stakes, auto-settlement when tips are resolved
- 🔗 **Shareable bet slips** — one click turns any slip into a public page at `/slip/abc123` with a copy-to-clipboard button and a "get today's tips" CTA
- 📱 **PWA** — installable on Android/iOS with offline app shell, standalone display, and home-screen icons
- 💰 **Bankroll tracker** — your profile shows real bet history, per-bet P&L, ROI and a cumulative P&L chart (recharts)
- 🔐 **Accounts & premium** — signup/sign-in (NextAuth credentials), premium plans via **Paystack** (daily/weekly/monthly passes), API-key settings panel
- 🛡️ **Rate limiting** — in-memory per-IP limits on register, newsletter, bets, payments and password-reset endpoints
- ⚽ **Live scores & standings** — live data from football-data.org with graceful demo fallback
- 🎨 Dark/light mode, animations, fully responsive

## Tech stack

| Layer      | Choice                                             |
| ---------- | -------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack, standalone)     |
| Language   | TypeScript                                         |
| Styling    | Tailwind CSS 4 + shadcn/ui                         |
| Database   | SQLite via Prisma (`db/custom.db`)                 |
| Auth       | NextAuth v4 (credentials, JWT sessions)            |
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
| `DATABASE_URL`            | ✅       | SQLite path (default `file:../db/custom.db`)                   |
| `PAYSTACK_SECRET_KEY`     | ❌       | Real Paystack charges; **absent = demo checkout**              |
| `NEXT_PUBLIC_PAYSTACK_KEY`| ❌       | Paystack inline popup in the browser (needs secret too)        |
| `FOOTBALL_API_KEY`        | ❌       | football-data.org key (or save it in Admin → API Key panel)    |
| `AFFILIATE_URL_TEMPLATE`  | ❌       | Tracked affiliate links for the odds comparison (see below)    |
| `NEXTAUTH_SECRET`         | ❌       | Session secret (a dev default is used if unset — set it in prod) |

## Scripts

| Script            | Description                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Dev server on port 3000                            |
| `npm run build`   | Production build (standalone output)               |
| `npm run start`   | Serve the standalone build (`bun .next/standalone/server.js`) |
| `npm run lint`    | ESLint                                             |
| `npm test`        | Vitest unit tests (`src/**/*.test.ts`)             |
| `npm run db:push` | Sync Prisma schema to the database                 |
| `npm run db:seed` | Seed tips (idempotent)                             |
| `npm run db:reset`| Drop & recreate the database                       |

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
| `POST /api/auth/register`      | Register account (rate-limited)             |
| `/api/auth/*`                  | NextAuth (csrf, callback, session, signout)  |
| `POST /api/auth/reset-password`| Request password reset (stub — add mailer)   |
| `POST /api/newsletter`         | Newsletter signup                            |
| `POST /api/bets/place`         | Place a bet (auto-settled if tips resolved)  |
| `GET /api/bets/history`        | User bet history                             |
| `POST /api/payment/initiate`   | Start Paystack checkout (or demo)            |
| `POST /api/payment/verify`     | Verify a charge & activate premium           |
| `POST /api/payment/webhook`    | Paystack webhook (HMAC-verified)             |
| `GET /api/settings/api-key`    | Check football-data key status               |

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

Any Node 18+ host works (VPS, Railway, Render, Fly.io…). The `Caddyfile` in the repo proxies port 3000 and forwards `XTransformPort` websocket ports (e.g. the 3004 odds service). For production, switch `DATABASE_URL` to a shared volume-backed SQLite file (or migrate to Postgres via Prisma).

## Project structure

```
src/
  app/
    page.tsx              # Landing page (all sections + modals)
    api/                  # Route handlers (see table above)
    layout.tsx            # Fonts, theme, auth provider, metadata
  components/
    goaledge/             # Site components (Header, TipCard, sections…)
    goaledge/modals/      # AuthModal, AdminPanel, OddsCompareModal, …
    ui/                   # shadcn/ui primitives
  lib/
    football-api.ts       # football-data.org client + seed data
    odds-comparison.ts    # Bookmaker odds board + affiliate links
    bet-settlement.ts     # Auto-settlement of bet slips
    auth.ts               # NextAuth options
  types/goaledge.ts       # Shared types
mini-services/odds-service # socket.io live odds streamer
examples/websocket/        # Minimal socket.io chat example
prisma/seed.mjs            # Database seed (npm run db:seed)
```

## Disclaimer

GoalEdge is for **18+ users only**. Gambling involves risk — bet responsibly. Odds shown are indicative market prices; GoalEdge may earn commissions on affiliate links without changing the price you see.
