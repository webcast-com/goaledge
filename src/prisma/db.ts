import sqlite from "@prisma/orm-sqlite/runtime";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

/**
 * Prisma Next (Prisma 8) client for the app's SQLite database.
 *
 * The contract in ./contract.prisma is compiled to contract.json / contract.d.ts
 * with `npm run db:emit` (sh scripts/prisma.sh emit) — the artefacts are
 * committed so the app boots without running the Prisma CLI.
 *
 * Query surface (see AGENTS.md → "Prisma Next"):
 *   db.orm.Tip.where({ status: "upcoming" }).orderBy((t) => t.createdAt.desc()).all()
 *   db.orm.Tip.first({ id })
 *   db.orm.Tip.where({ id }).update({ ... });  db.orm.Tip.create({ ... });
 */
export const db = sqlite<Contract>({
  contractJson,
  path: sqlitePath(),
});

/**
 * Resolve the SQLite file path from the environment.
 *
 * Prisma Next's SQLite façade takes a filesystem `path`, not a URL: strip the
 * `file:` prefix and resolve relative entries against the project root (the
 * legacy Prisma Postgres URL in .env is ignored — this app stores data in SQLite).
 */
export function sqlitePath(): string {
  const raw = process.env.DATABASE_URL ?? "";
  if (!raw.startsWith("file:")) {
    if (raw) {
      const scheme = raw.split(":")[0] || "unset";
      console.warn(
        `[db] DATABASE_URL uses an unsupported "${scheme}:" scheme for the sqlite target — ` +
          `using db/custom.db`,
      );
    }
    return `${process.cwd()}/db/custom.db`;
  }
  const withoutScheme = raw.slice("file:".length).replace(/^\.\//, "");
  return withoutScheme.startsWith("/")
    ? withoutScheme
    : `${process.cwd()}/${withoutScheme}`;
}

export type { Contract };
