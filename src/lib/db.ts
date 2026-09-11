/**
 * The app's single data-access import surface.
 *
 * Since the Prisma Next (Prisma 8) migration the client is the SQLite façade
 * defined in `src/prisma/db.ts`; it is re-exported here so routes keep a stable
 * `import { db } from "@/lib/db"` entry point.
 */
export { db, sqlitePath, type Contract } from "@/prisma/db";

/**
 * Models exposed by the contract, in the casing the rest of the app expects.
 * Kept as a type alias for the few helpers that used to take a `PrismaClient`.
 */
export type DbClient = typeof import("@/prisma/db").db;
