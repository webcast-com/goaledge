# GoalEdge project notes

## Stack
- **Next.js 16 App Router**, TypeScript, Tailwind CSS 4, shadcn/ui, Framer Motion.
- **Supabase Postgres** through `@supabase/supabase-js` and the server-only compatibility data layer in `src/lib/db.ts`.
- **Bun** is the package manager (`bun.lock` is the source of truth); Node.js 22+ is also supported.

## Running the app
```bash
bun install
bun run dev
```
The dev server uses port 3000. Supabase credentials are required for database-backed flows; API handlers with graceful fallbacks may still render without them. `docker-compose.base44.yml` starts the dev server but does not seed or mutate a hosted database on startup.

## Database
- Set `SUPABASE_URL` and either `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in the server environment. `NEXT_PUBLIC_SUPABASE_URL` is accepted as a URL fallback; database keys must never use the `NEXT_PUBLIC_` prefix.
- `src/lib/db.ts` is the only app data-access layer. It uses Supabase's Data API and maps the existing `db.orm.<Model>` calls to PostgREST. Do not import the secret-backed database module in client components.
- Postgres tables/columns use `snake_case`; the adapter translates to/from the app's existing PascalCase model and camelCase field names. Date/time columns are converted to `Date` objects.
- `Tip.isPremium` and `Newsletter.active` remain integer flags (`0` or `1`) to preserve existing API behavior.
- SQL schema and RLS/grants live in `supabase/migrations/`. Add schema changes as a new timestamped SQL migration; apply with `supabase db push` after linking the CLI to the target project.
- `npm run db:seed` adds idempotent demo tips and backfills missing referral codes. `npm run db:import:sqlite` imports the legacy `db/custom.db` once; it also carries password hashes and app settings, so only run it for a project you control.
- The Supabase secret/service-role key bypasses RLS and is trusted. RLS is enabled with no browser-role policies; keep all DB access on the server.

## Other notes
- External football data (football-data.org), Paystack, and the Socket.IO odds service are optional. Configure both Paystack keys as a matching pair or leave both unset; never commit live keys, and keep `.env` local/ignored.
- `AUTH_SECRET` should be set to a random value in production; app authentication remains the existing bcrypt + signed HttpOnly session cookie flow, not Supabase Auth.
- `next.config.ts` derives `allowedDevOrigins` from `BASE44_PUBLIC_HOST_SUFFIX` for Arena/Base44 preview hosts.

## Verification
```bash
bun run lint
bun run test
bun run build
```
