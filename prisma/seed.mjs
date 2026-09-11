/**
 * GoalEdge database seed
 * ----------------------
 * Seeds the SQLite database with:
 *   1. Six upcoming tips (the same fixtures the API falls back to)
 *   2. Ten settled tips (won/lost/void) so the track record & stats sections
 *      have real data from day one
 *
 * Idempotent — safe to run repeatedly (upserts by fixed ids).
 *
 * Usage: npm run db:seed   (or: npx prisma db seed)
 */
// Prisma Next (Prisma 8) seed. The contract artefacts are committed under
// src/prisma, so this runs without the Prisma CLI. The client is the SQLite
// façade from @prisma/orm-sqlite; it uses the Node built-in `node:sqlite`
// driver, so run it with Node >= 22.5 (or Bun >= 1.2). scripts/prisma.sh seed
// picks the runtime.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Load .env before the client is created — Node does not read it automatically
// the way Bun does, and the SQLite façade resolves its file path at import time.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  const envFile = fs.readFileSync(path.join(projectRoot, ".env"), "utf8");
  for (const line of envFile.split("\n")) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const value = match[2].replace(/^["']|["']$/g, "");
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
} catch {
  // No .env — fall back to the default db/custom.db path.
}

const { db } = await import("../src/prisma/db.ts");

function fmtDate(offsetDays, hour) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]}, ${String(d.getHours()).padStart(2, "0")}:00`;
}

const upcomingTips = [
  {
    id: "seed_1", league: "Premier League", country: "England", flag: "🦁",
    homeTeam: "Arsenal", awayTeam: "Liverpool",
    matchTime: fmtDate(0, 13), predictionType: "Match Result", prediction: "Arsenal to Win",
    odds: "2.10", confidence: 78, confidenceLabel: "High", status: "upcoming",
    tipster: "GoalEdge AI", isPremium: false,
  },
  {
    id: "seed_2", league: "La Liga", country: "Spain", flag: "🇪🇸",
    homeTeam: "Real Madrid", awayTeam: "Barcelona",
    matchTime: fmtDate(0, 15), predictionType: "Over/Under", prediction: "Over 2.5 Goals",
    odds: "1.65", confidence: 82, confidenceLabel: "High", status: "upcoming",
    tipster: "Data Analyst", isPremium: false,
  },
  {
    id: "seed_3", league: "Serie A", country: "Italy", flag: "🇮🇹",
    homeTeam: "Inter Milan", awayTeam: "AC Milan",
    matchTime: fmtDate(0, 17), predictionType: "Both Teams to Score", prediction: "BTTS - Yes",
    odds: "1.75", confidence: 76, confidenceLabel: "High", status: "upcoming",
    tipster: "Arena Tipster", isPremium: true,
  },
  {
    id: "seed_4", league: "Bundesliga", country: "Germany", flag: "🇩🇪",
    homeTeam: "Bayern Munich", awayTeam: "Dortmund",
    matchTime: fmtDate(1, 14), predictionType: "Match Result", prediction: "Bayern Munich to Win",
    odds: "1.55", confidence: 85, confidenceLabel: "Very High", status: "upcoming",
    tipster: "GoalEdge AI", isPremium: false,
  },
  {
    id: "seed_5", league: "Ligue 1", country: "France", flag: "🇫🇷",
    homeTeam: "PSG", awayTeam: "Monaco",
    matchTime: fmtDate(1, 19), predictionType: "Double Chance", prediction: "Double Chance - Home/Draw",
    odds: "1.30", confidence: 88, confidenceLabel: "Very High", status: "upcoming",
    tipster: "Data Analyst", isPremium: false,
  },
  {
    id: "seed_6", league: "NPFL", country: "Nigeria", flag: "🇳🇬",
    homeTeam: "Enyimba", awayTeam: "Rangers Intl",
    matchTime: fmtDate(1, 15), predictionType: "Double Chance", prediction: "Double Chance - Home/Draw",
    odds: "1.35", confidence: 84, confidenceLabel: "Very High", status: "upcoming",
    tipster: "Local Expert", isPremium: true,
  },
];

const settledTips = [
  {
    id: "hist_1", league: "Premier League", country: "England", flag: "🦁",
    homeTeam: "Arsenal", awayTeam: "Chelsea", matchTime: "10 Jul, 15:00",
    predictionType: "Match Result", prediction: "Arsenal to Win", odds: "1.85",
    confidence: 82, confidenceLabel: "High", status: "won", tipster: "Arena Tipster",
    isPremium: false, analysis: "Arsenal have won 8 of their last 10 home matches against Chelsea. Strong form and key player availability.",
  },
  {
    id: "hist_2", league: "La Liga", country: "Spain", flag: "🇪🇸",
    homeTeam: "Barcelona", awayTeam: "Atletico Madrid", matchTime: "09 Jul, 20:00",
    predictionType: "Over/Under", prediction: "Over 2.5 Goals", odds: "1.70",
    confidence: 76, confidenceLabel: "High", status: "won", tipster: "Data Analyst",
    isPremium: true, analysis: "Both teams have high-scoring records. Last 5 meetings averaged 3.4 goals.",
  },
  {
    id: "hist_3", league: "Serie A", country: "Italy", flag: "🇮🇹",
    homeTeam: "AC Milan", awayTeam: "Napoli", matchTime: "08 Jul, 18:30",
    predictionType: "Both Teams to Score", prediction: "Both Teams to Score - Yes", odds: "1.90",
    confidence: 72, confidenceLabel: "Medium", status: "lost", tipster: "Arena Tipster",
    isPremium: false, analysis: "Napoli kept a clean sheet in this match. Our BTTS analysis missed their recent defensive improvements.",
  },
  {
    id: "hist_4", league: "Bundesliga", country: "Germany", flag: "🇩🇪",
    homeTeam: "Bayern Munich", awayTeam: "RB Leipzig", matchTime: "07 Jul, 14:30",
    predictionType: "Match Result", prediction: "Bayern Munich to Win", odds: "1.50",
    confidence: 88, confidenceLabel: "Very High", status: "won", tipster: "Arena Tipster",
    isPremium: true, analysis: "Bayern have a 90% home win rate this season. Leipzig missing 3 key starters.",
  },
  {
    id: "hist_5", league: "Ligue 1", country: "France", flag: "🇫🇷",
    homeTeam: "PSG", awayTeam: "Marseille", matchTime: "06 Jul, 21:00",
    predictionType: "Handicap", prediction: "PSG -1.5 Handicap", odds: "2.10",
    confidence: 68, confidenceLabel: "Medium", status: "lost", tipster: "Data Analyst",
    isPremium: true, analysis: "PSG won but only by 1 goal. The handicap was too ambitious for this fixture.",
  },
  {
    id: "hist_6", league: "NPFL", country: "Nigeria", flag: "🇳🇬",
    homeTeam: "Enyimba", awayTeam: "Rangers Intl", matchTime: "05 Jul, 15:00",
    predictionType: "Double Chance", prediction: "Double Chance - Home/Draw", odds: "1.35",
    confidence: 85, confidenceLabel: "Very High", status: "won", tipster: "Local Expert",
    isPremium: false, analysis: "Enyimba undefeated at home this season. Strong defensive record makes this a safe pick.",
  },
  {
    id: "hist_7", league: "Premier League", country: "England", flag: "🦁",
    homeTeam: "Liverpool", awayTeam: "Man City", matchTime: "04 Jul, 16:30",
    predictionType: "Match Result", prediction: "Liverpool to Win", odds: "2.25",
    confidence: 65, confidenceLabel: "Medium", status: "void", tipster: "Arena Tipster",
    isPremium: true, analysis: "Match was postponed due to weather conditions. Bet voided and stakes returned.",
  },
  {
    id: "hist_8", league: "La Liga", country: "Spain", flag: "🇪🇸",
    homeTeam: "Real Madrid", awayTeam: "Real Sociedad", matchTime: "03 Jul, 19:00",
    predictionType: "Over/Under", prediction: "Under 3.5 Goals", odds: "1.65",
    confidence: 79, confidenceLabel: "High", status: "won", tipster: "Data Analyst",
    isPremium: false, analysis: "Real Sociedad's defensive setup limited Madrid to 2 goals. Solid under pick.",
  },
  {
    id: "hist_9", league: "Serie A", country: "Italy", flag: "🇮🇹",
    homeTeam: "Inter Milan", awayTeam: "Roma", matchTime: "02 Jul, 20:45",
    predictionType: "Match Result", prediction: "Inter Milan to Win", odds: "1.55",
    confidence: 84, confidenceLabel: "Very High", status: "won", tipster: "Arena Tipster",
    isPremium: false, analysis: "Inter's home dominance continues. Roma struggling with away form all season.",
  },
  {
    id: "hist_10", league: "Bundesliga", country: "Germany", flag: "🇩🇪",
    homeTeam: "Dortmund", awayTeam: "Leverkusen", matchTime: "01 Jul, 17:30",
    predictionType: "Both Teams to Score", prediction: "Both Teams to Score - Yes", odds: "1.55",
    confidence: 81, confidenceLabel: "High", status: "won", tipster: "Data Analyst",
    isPremium: true, analysis: "Both teams have scored in 9 of their last 10 encounters. High-scoring affair expected.",
  },
];

async function main() {
  let created = 0;
  let updated = 0;

  for (const tip of upcomingTips) {
    await db.orm.Tip.where({ id: tip.id }).upsert({
      create: { ...tip, isPremium: tip.isPremium ? 1 : 0 },
      update: { ...tip, isPremium: tip.isPremium ? 1 : 0 },
    });
    created++;
  }

  for (let i = 0; i < settledTips.length; i++) {
    const tip = settledTips[i];
    const createdAt = new Date(Date.now() - (i + 1) * 86400000); // staggered: 1..10 days ago
    await db.orm.Tip.where({ id: tip.id }).upsert({
      create: { ...tip, isPremium: tip.isPremium ? 1 : 0, createdAt },
      update: { ...tip, isPremium: tip.isPremium ? 1 : 0 },
    });
    updated++;
  }

  // Backfill referral codes for existing users (accounts created before the
  // referral program existed).
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const makeCode = () =>
    Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
  const usersWithoutCode = await db.orm.User.where((u) => u.referralCode.isNull())
    .select("id")
    .all();
  for (const u of usersWithoutCode) {
    let code = makeCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const clash = await db.orm.User.where({ referralCode: code }).first();
      if (!clash) break;
      code = makeCode();
    }
    await db.orm.User.where({ id: u.id }).update({ referralCode: code });
  }
  if (usersWithoutCode.length > 0) {
    console.log(`Backfilled referral codes for ${usersWithoutCode.length} existing user(s).`);
  }

  const counts = {
    upcoming: (await db.orm.Tip.where({ status: "upcoming" }).aggregate((a) => ({ n: a.count() }))).n,
    settled: (
      await db.orm.Tip.where((t) => t.status.in(["won", "lost", "void"]))
        .aggregate((a) => ({ n: a.count() }))
    ).n,
  };
  console.log(`Seed complete: ${created} upcoming + ${updated} settled tips upserted.`);
  console.log(`DB now has ${counts.upcoming} upcoming and ${counts.settled} settled tips.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.close();
  });
