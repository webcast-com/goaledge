import path from "node:path";
import { defineConfig } from "prisma/config";

// The schema declares a `sqlite` datasource, so only a `file:` URL can work.
// .env still holds an old Prisma Postgres connection string — ignore it instead
// of letting the CLI talk to the wrong database (src/lib/db.ts does the same).
const DB_PATH = path.resolve(process.cwd(), "db", "custom.db");

function sqliteUrl() {
  const raw = process.env.DATABASE_URL ?? "";
  // Absolute path on purpose: a relative `file:./db/custom.db` gets resolved by
  // the CLI relative to prisma/, which is how the stray prisma/db/custom.db file
  // (empty tables, no data) came to exist while the app read db/custom.db.
  if (!raw.startsWith("file:")) {
    const scheme = raw.split(":")[0] || "unset";
    if (raw) {
      console.warn(
        `[prisma.config] DATABASE_URL uses an unsupported "${scheme}:" scheme for the sqlite ` +
          `datasource — using file:${DB_PATH}`,
      );
    }
    return `file:${DB_PATH}`;
  }
  if (raw.startsWith("file:/")) return raw; // already absolute
  return `file:${path.resolve(process.cwd(), raw.slice("file:".length).replace(/^\.\//, ""))}`;
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    // Read by `prisma db seed`; picks Bun or Node and needs no CLI engines
    // (see scripts/prisma.sh). The old top-level `seed:` key is not part of the
    // @prisma/config 7.x schema and was silently ignored.
    seed: "sh scripts/prisma.sh seed",
  },
  datasource: {
    url: sqliteUrl(),
  },
});
