# Base44 Dev Environment

## Stack
- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind 4 + shadcn/ui
- **Prisma Next — Prisma 8 RC** (`prisma@8.0.0-rc.13`, `@prisma/orm-sqlite@8.0.0-rc.9`) with
  SQLite (`db/custom.db`). Contract-first: `src/prisma/contract.prisma` compiles to
  `contract.json` + `contract.d.ts`, and `src/prisma/db.ts` exposes the client. The SQLite façade
  talks to the file through Node's built-in `node:sqlite` driver
- **Bun** is the package manager (`bun.lock` is the source of truth)
- **Framer Motion** for animations, **Recharts** for charts

## Running the app
```bash
docker compose -f docker-compose.base44.yml up -d
```
- Web service on **port 3000** (`next dev --webpack` with live reload).
  **Prefer `--webpack` over the default Turbopack**: the SQLite façade is kept external via
  `serverExternalPackages` in `next.config.ts` (webpack verified working end to end).
- The compose command chains: `bun install` → `bun run db:emit` → `bun run db:seed` →
  `bunx next dev --webpack`. `db:emit` recompiles the contract (only needed after editing it);
  the committed `contract.json`/`contract.d.ts` mean the app boots without any Prisma CLI step.
- **bun must implement `node:sqlite`** — the driver behind the façade. Verified on bun 1.4.2;
  keep the image at `oven/bun:1` (or newer) rather than pinning an older 1.2.x.
- Source is bind-mounted at `/app`; `node_modules` is an anonymous volume (isolated from host).

## Database
- SQLite file at `db/custom.db` (already committed with data). `prisma.config.ts` and
  `src/prisma/db.ts` both resolve it from the project root.
- `prisma/seed.mjs` is idempotent — safe to run repeatedly; it runs under bun or node.
- `DATABASE_URL` must be a `file:` URL. `src/prisma/db.ts` and `prisma.config.ts` ignore a
  non-file scheme (the repo used to ship an old Prisma Postgres URL) and fall back to
  `file:<root>/db/custom.db`.
- **Boolean is not a SQLite PSL type in Prisma Next.** `Tip.isPremium` and `Newsletter.active` are
  `Int` (0|1) in the contract; convert at the boundaries (`x ? 1 : 0` on write,
  `=== 1` / `Boolean(x)` on read) so API JSON keeps returning `true`/`false`.
- **String ids are app-generated.** The SQLite target has no `cuid()`/`uuid()` execution
  generators, so create calls pass `id: newId()` from `src/lib/ids.ts`. `Newsletter.id` is the one
  autoincrement column and needs no id.
- **Storage names.** Every model carries `@@map("<Model>")` so the contract matches the PascalCase
  tables created by the old Prisma 7 schema. SQLite identifiers are case-insensitive, but keeping
  the mapping exact avoids surprises.
- `prisma db verify` / `db sign` report differences inherited from that Prisma 7 DDL (timestamp
  column affinity, auto-index names) — the app does not need the marker, and queries work unsigned.

## Prisma Next workflow (contract-first)
Prisma 8 is the Prisma Next RC line: there is no `prisma generate`, no `prisma db push`, and no
generated client in `node_modules`. Everything flows from the contract:

```
src/prisma/contract.prisma      authored models (PSL)
  ↓  sh scripts/prisma.sh emit  (bun run db:emit)
src/prisma/contract.json        compiled contract (committed)
src/prisma/contract.d.ts        typed contract (committed)
src/prisma/db.ts                the client: sqlite<Contract>({ contractJson, path })
src/lib/db.ts                   re-export used by the app (db.orm.<Model>)
```

- Query surface: `db.orm.Tip.where({...}).orderBy(t => t.createdAt.desc()).limit(12).all()`,
  `.first({ id })`, `.select("id","status")`, `.create({...})`, `.where({...}).update({...})`,
  `.where({...}).delete()`, `.where({...}).upsert({ create, update })`,
  `.aggregate(a => ({ n: a.count() }))`, `db.transaction(async (tx) => …)`.
- After editing the contract run `bun run db:emit`; commit `contract.json` and `contract.d.ts`.
- Schema changes go to the database with `prisma db update` (`bun run db:push` is mapped to it).
  Back up `db/custom.db` first — there is no `db push --accept-data-loss` safety net here.
- `scripts/prisma.sh` wraps it all (`emit`, `verify`, `update`, `seed`, `migrate`, `status`) and works
  offline: the v8 CLI is pure JavaScript, so it never reaches `binaries.prisma.sh`.
- **No Next.js plugin exists** for Prisma Next — a contract edit is not picked up until `db:emit`
  runs. `postinstall` does it automatically; run it manually when iterating.

## External services (all optional)
- **Paystack** (payments): runs in demo mode without keys.
- **football-data.org** (live fixtures): falls back to seed data without a key.
- **socket.io odds service** (`mini-services/odds-service`): optional realtime odds; the app
  works without it (falls back to seed/static odds). Not started by the Base44 compose.
- **AUTH_SECRET**: a dev secret is used if unset.

## Next.js config quirks
- **`serverExternalPackages`** — `@prisma/orm-sqlite` is listed so the bundler leaves the façade
  (and its `node:sqlite` import) to Node at runtime.
- **`allowedDevOrigins`** — derived from `BASE44_PUBLIC_HOST_SUFFIX` at runtime so the preview's
  external origin can load dev assets/HMR. Without this, Next.js returns 403 for `_next/static`
  requests from the preview host.

## Verifying it works
```bash
curl -sf http://localhost:3000/                       # should return 200 + HTML
docker compose -f docker-compose.base44.yml logs web   # dev server logs
```
