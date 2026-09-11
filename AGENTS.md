# Base44 Dev Environment

## Stack
- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind 4 + shadcn/ui
- **Prisma 7** (CLI `prisma@7.10`, `@prisma/client@7.10`) with SQLite (`db/custom.db`) via the
  `@prisma/adapter-libsql` driver adapter
- **Bun** is the package manager (`bun.lock` is the source of truth)
- **Framer Motion** for animations, **Recharts** for charts

## Running the app
```bash
docker compose -f docker-compose.base44.yml up -d
```
- Web service on **port 3000** (`next dev --webpack` with live reload).
  **Must use `--webpack`, not the default Turbopack.** The generated client and the libSQL
  driver adapter must be loaded from `node_modules` at runtime (`serverExternalPackages` in
  `next.config.ts`); Turbopack has trouble bundling them.
- The compose command chains: `bun install` → `bun run db:generate` → `bun run db:push` → `bun run db:seed`
  → `bunx next dev --webpack`. The Prisma steps are wrapped by `scripts/prisma.sh` so a blocked
  `binaries.prisma.sh` cannot stop the boot chain (see "Prisma without a network" below).
- Source is bind-mounted at `/app`; `node_modules` is an anonymous volume (isolated from host).

## Database
- SQLite file at `db/custom.db` (already committed with data). `prisma/db/custom.db` is a stale,
  empty leftover — ignore it; `prisma.config.ts` and `src/lib/db.ts` both target the root file.
- `prisma/seed.mjs` is idempotent — safe to run repeatedly.
- **Important:** `prisma/seed.mjs` must construct `PrismaClient` with the `PrismaLibSql` adapter
  (note the casing — `@prisma/adapter-libsql@7` does **not** export `PrismaLibSQL`) plus the
  driver adapter; a bare `new PrismaClient()` fails with `P2038 — Missing configured driver adapter`.
- `DATABASE_URL` must be a `file:` URL. `src/lib/db.ts` and `prisma.config.ts` both ignore a
  non-file scheme (the repo used to ship an old Prisma Postgres URL) and fall back to
  `file:<root>/db/custom.db`.

## Prisma without a network (offline / Base44 sandbox)
The Prisma CLI downloads a native `schema-engine` from `binaries.prisma.sh` before *any* command
(watch it fail with `prisma generate`, `db push`, even `--version`). That host is unreachable in the
Base44/Arena sandbox, so the classic workflow died during `bun install` and never reached `next dev`.

The fix, in place now:

- The client is **generated into the repository** — `prisma/schema.prisma` uses
  `provider = "prisma-client"` with `output = "../src/generated/prisma"` (committed, ~700 KB of
  TypeScript, `importFileExtension = "ts"`). The app imports it via `@/generated/prisma/client`;
  the only runtime dependency is the `@prisma/client` WASM/driver-adapter runtime, so no native
  engine is needed to run the app.
- `scripts/prisma.sh` wraps every Prisma command: `generate` retries with a local no-op
  `PRISMA_SCHEMA_ENGINE_BINARY` (generation reads the schema with prisma-schema-wasm and never
  executes the engine), `push` skips with a warning when the engine is unavailable (the committed
  DB already carries the schema), `seed` picks Bun or Node, `status` prints all of it.
- `bun run db:generate` / `db:push` / `db:seed` / `db:status` use that wrapper; `postinstall` uses
  `generate` so installs no longer abort. Do not reintroduce bare `prisma generate` / `prisma db push`
  into postinstall or the compose command.

## External services (all optional)
- **Paystack** (payments): runs in demo mode without keys.
- **football-data.org** (live fixtures): falls back to seed data without a key.
- **socket.io odds service** (`mini-services/odds-service`): optional realtime odds; the app
  works without it (falls back to seed/static odds). Not started by the Base44 compose.
- **AUTH_SECRET**: a dev secret is used if unset.

## Next.js config quirks
- **`serverExternalPackages`** — `@prisma/client`, `@prisma/adapter-libsql`, and `@libsql/client`
  are listed so the bundler doesn't try to package the native libSQL module or the hashed
  Prisma client. Without this, webpack fails parsing `@libsql/isomorphic-fetch/README.md`.
- **`allowedDevOrigins`** — derived from `BASE44_PUBLIC_HOST_SUFFIX` at runtime so the preview's
  external origin can load dev assets/HMR. Without this, Next.js returns 403 for `_next/static`
  requests from the preview host.

## Verifying it works
```bash
curl -sf http://localhost:3000/                       # should return 200 + HTML
docker compose -f docker-compose.base44.yml logs web   # dev server logs
```
