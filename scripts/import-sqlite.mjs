/**
 * One-time import of the committed legacy SQLite database into Supabase.
 *
 * Usage: npm run db:import:sqlite [-- path/to/custom.db]
 * Requires Node 22+ (node:sqlite) and server-side Supabase credentials.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { createClient } from "@supabase/supabase-js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.resolve(projectRoot, process.argv[2] ?? "db/custom.db");

try {
  const envFile = fs.readFileSync(path.join(projectRoot, ".env"), "utf8");
  for (const line of envFile.split("\n")) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const value = match[2].replace(/^["']|["']$/g, "");
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
} catch {
  // Credentials can also be supplied by the shell or deployment environment.
}

const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
if (!url || !key) {
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) before importing.",
  );
}
if (!fs.existsSync(sourcePath)) {
  throw new Error(`SQLite source file not found: ${sourcePath}`);
}

const supabase = createClient(url.replace(/\/+$/, ""), key, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});
const sqlite = new DatabaseSync(sourcePath, { readOnly: true });
const tables = [
  { source: "User", target: "users", conflict: "id" },
  { source: "Tip", target: "tips", conflict: "id" },
  { source: "Referral", target: "referrals", conflict: "id" },
  { source: "Bookmark", target: "bookmarks", conflict: "id" },
  { source: "BetSlip", target: "bet_slips", conflict: "id" },
  // Newsletter ids are database-generated in Postgres. Email is unique and no
  // other table references a newsletter row, so let Supabase assign new ids.
  { source: "Newsletter", target: "newsletter_subscribers", conflict: "email", omitId: true },
  { source: "Payment", target: "payments", conflict: "id" },
  { source: "PlacedBet", target: "placed_bets", conflict: "id" },
  { source: "AppSetting", target: "app_settings", conflict: "key" },
  { source: "SharedSlip", target: "shared_slips", conflict: "slug" },
];

function toSnakeCase(value) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toIsoDate(value, table, field) {
  let date;
  if (typeof value === "number") {
    // Handle Unix seconds, milliseconds and SQLite microsecond timestamps.
    const milliseconds = value > 1e14 ? value / 1000 : value > 1e11 ? value : value * 1000;
    date = new Date(milliseconds);
  } else {
    const text = String(value);
    const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(text);
    date = new Date(hasTimezone ? text : `${text.replace(" ", "T")}Z`);
  }
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${table}.${field} timestamp in SQLite: ${String(value)}`);
  }
  return date.toISOString();
}

function convertRow(row, table) {
  const converted = {};
  for (const [field, value] of Object.entries(row)) {
    if (table.omitId && field === "id") continue;
    const column = toSnakeCase(field);
    const isDate = field.endsWith("At");
    converted[column] = value == null
      ? value
      : isDate
        ? toIsoDate(value, table.source, field)
        : value;
  }
  return converted;
}

async function main() {
  const existingTables = new Set(
    sqlite
      .prepare("select name from sqlite_master where type = 'table'")
      .all()
      .map((row) => row.name),
  );
  let totalRows = 0;

  for (const table of tables) {
    if (!existingTables.has(table.source)) {
      console.log(`Skipping ${table.source}: table not present in ${path.basename(sourcePath)}.`);
      continue;
    }

    const rows = sqlite
      .prepare(`select * from "${table.source}"`)
      .all()
      .map((row) => convertRow(row, table));

    for (let start = 0; start < rows.length; start += 250) {
      const chunk = rows.slice(start, start + 250);
      const { error } = await supabase
        .from(table.target)
        .upsert(chunk, { onConflict: table.conflict });
      if (error) {
        throw new Error(
          `Import into ${table.target} failed after ${start} rows: ${error.message}`,
          { cause: error },
        );
      }
    }

    totalRows += rows.length;
    console.log(`Imported ${rows.length} ${table.source} row(s) → ${table.target}.`);
  }

  console.log(`SQLite import finished: ${totalRows} total row(s) processed.`);
}

try {
  await main();
} finally {
  sqlite.close();
}
