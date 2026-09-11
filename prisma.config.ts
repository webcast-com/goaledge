import "dotenv/config";
import path from "node:path";
import { definePrismaConfig } from "@prisma/cli-engine";
import { defineConfig as ormConfig } from "@prisma/orm-sqlite/config";

// Prisma Next (8.x) configuration. The contract lives in src/prisma/contract.prisma
// and is compiled to src/prisma/contract.json + contract.d.ts by:
//   npm run db:emit        (sh scripts/prisma.sh emit)
//
// The SQLite target only accepts a `file:` connection string, so a legacy
// Prisma Postgres DATABASE_URL in .env is ignored rather than handed to the CLI.
const DB_PATH = path.resolve(process.cwd(), "db", "custom.db");

function sqliteConnection(): string {
  const raw = process.env.DATABASE_URL ?? "";
  if (!raw.startsWith("file:")) {
    if (raw) {
      const scheme = raw.split(":")[0] || "unset";
      console.warn(
        `[prisma.config] DATABASE_URL uses an unsupported "${scheme}:" scheme for the sqlite ` +
          `target — using file:${DB_PATH}`,
      );
    }
    return `file:${DB_PATH}`;
  }
  if (raw.startsWith("file:/")) return raw; // already absolute
  return `file:${path.resolve(process.cwd(), raw.slice("file:".length).replace(/^\.\//, ""))}`;
}

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./src/prisma/contract.prisma",
    db: {
      connection: sqliteConnection(),
    },
  }),
});
