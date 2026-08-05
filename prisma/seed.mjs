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
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

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
    await db.tip.upsert({
      where: { id: tip.id },
      create: tip,
      update: { ...tip },
    });
    created++;
  }

  for (let i = 0; i < settledTips.length; i++) {
    const tip = settledTips[i];
    const createdAt = new Date(Date.now() - (i + 1) * 86400000); // staggered: 1..10 days ago
    await db.tip.upsert({
      where: { id: tip.id },
      create: { ...tip, createdAt },
      update: { ...tip },
    });
    updated++;
  }

  const counts = {
    upcoming: await db.tip.count({ where: { status: "upcoming" } }),
    settled: await db.tip.count({ where: { status: { in: ["won", "lost", "void"] } } }),
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
    await db.$disconnect();
  });
