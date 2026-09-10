# Base44 Dev Environment

## Stack
- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind 4 + shadcn/ui
- **Prisma 6** with SQLite (`db/custom.db`) via the `@prisma/adapter-libsql` driver adapter
- **Bun** is the package manager (`bun.lock` is the source of truth)
- **Framer Motion** for animations, **Recharts** for charts

## Running the app
```bash
docker compose -f docker-compose.base44.yml up -d
```
- Web service on **port 3000** (`next dev --webpack` with live reload).
  **Must use `--webpack`, not the default Turbopack.** Prisma 6 with `engineType: "client"` +
  driver adapters generates a hashed client module (`@prisma/client-<hash>`) that Turbopack
  cannot resolve. Webpack works because `next.config.ts` lists the Prisma/libSQL packages in
  `serverExternalPackages`, so they're loaded from `node_modules` at runtime instead of bundled.
- The compose command chains: `bun install` → `prisma generate` → `db:push` → `db:seed` → `next dev --webpack`.
- Source is bind-mounted at `/app`; `node_modules` is an anonymous volume (isolated from host).

## Database
- SQLite file at `db/custom.db` (already committed with data).
- `prisma/seed.mjs` is idempotent — safe to run repeatedly.
- **Important:** `prisma/seed.mjs` must construct `PrismaClient` with the `PrismaLibSQL` adapter
  (the schema uses `engineType = "client"` + driver adapters; a bare `new PrismaClient()` fails
  with `P2038 — Missing configured driver adapter`).

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
