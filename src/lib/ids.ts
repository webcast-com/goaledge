import { randomUUID } from "node:crypto";

/**
 * Generate a primary-key string for models whose `id` has no database-side
 * default. Prisma Next's SQLite target does not ship `cuid()` / `uuid()`
 * generators (they are execution generators the SQLite driver does not
 * implement), so ids are created in the application.
 *
 * Format: 25 chars, URL-safe, collision-resistant — a drop-in for the cuid v1
 * strings the existing rows (and the Prisma 7 seed) use.
 */
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

export function newId(): string {
  // Time prefix keeps ids roughly sortable, the UUID suffix carries entropy.
  const now = BigInt(Date.now());
  let time = "";
  for (let i = 0; i < 8; i++) {
    time = ALPHABET[Number(now >> BigInt(i * 5)) & 31] + time;
  }
  const uuid = randomUUID().replace(/-/g, "");
  let suffix = "";
  for (let i = 0; i < 16; i++) {
    suffix += ALPHABET[parseInt(uuid[i], 16) & 31];
  }
  return `c${time}${suffix}`;
}
