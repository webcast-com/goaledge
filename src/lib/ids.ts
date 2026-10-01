import { randomUUID } from "node:crypto";

/**
 * Generate primary-key strings for models whose ids are assigned by the app
 * rather than a database identity column. Keeping ids app-generated also makes
 * them stable across the legacy SQLite import and the Supabase Postgres store.
 *
 * Format: 25 chars, URL-safe, collision-resistant — compatible with the cuid v1
 * strings already present in imported data.
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
