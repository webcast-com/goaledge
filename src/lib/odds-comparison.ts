/**
 * Odds Comparison Service
 * ------------------------
 * Generates a per-bookmaker odds board for each tip, highlighting the best
 * price and building affiliate links for every bookmaker.
 *
 * Bookmaker odds are derived deterministically from the base odds (seeded by
 * the tip id) so the board is stable across renders while still looking like
 * a real market. When the socket.io odds service (mini-services/odds-service)
 * is connected, its live updates can override the "best odds" display.
 *
 * Affiliate links: by default each bookmaker links to their site with
 * ?ref=goaledge. To plug in real tracked affiliate links, set the
 * AFFILIATE_URL_TEMPLATE env var, e.g.:
 *   AFFILIATE_URL_TEMPLATE=https://track.affiliates.com/?a=123&m={bookmaker}&o={odds}&h={home}&a2={away}
 * Placeholders: {bookmaker} {odds} {home} {away} {prediction}
 */

import type { BookmakerOddsEntry, OddsComparison } from "@/types/goaledge";

export type { BookmakerOddsEntry, OddsComparison };

export interface OddsComparableTip {
  id: string;
  odds: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
}

const BOOKMAKERS: { name: string; url: string }[] = [
  { name: "BetKing", url: "https://www.betking.com" },
  { name: "1xBet", url: "https://1xbet.co.ke" },
  { name: "SportyBet", url: "https://www.sportybet.com/ke" },
  { name: "Betway", url: "https://betway.com/en/ke" },
  { name: "22Bet", url: "https://www.22bet.co.ke" },
];

/** Deterministic string hash so the same tip always gets the same spread. */
function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Deterministic per-bookmaker spread around the base odds (-0.08 … +0.20). */
function spreadFor(seed: number, index: number): number {
  const r = ((seed >> (index * 3)) % 997) / 997; // 0..1
  return -0.08 + r * 0.28;
}

function buildAffiliateUrl(
  bookmaker: string,
  fallbackUrl: string,
  tip: OddsComparableTip,
  odds: number
): string {
  const template = process.env.AFFILIATE_URL_TEMPLATE;
  if (template) {
    return template
      .replaceAll("{bookmaker}", encodeURIComponent(bookmaker))
      .replaceAll("{odds}", odds.toFixed(2))
      .replaceAll("{home}", encodeURIComponent(tip.homeTeam))
      .replaceAll("{away}", encodeURIComponent(tip.awayTeam))
      .replaceAll("{prediction}", encodeURIComponent(tip.prediction));
  }
  const url = new URL(fallbackUrl);
  url.searchParams.set("ref", "goaledge");
  url.searchParams.set("odds", odds.toFixed(2));
  return url.toString();
}

export function getOddsComparison(tip: OddsComparableTip): OddsComparison {
  const baseOdds = parseFloat(tip.odds);
  const base = Number.isFinite(baseOdds) && baseOdds > 1 ? baseOdds : 2.0;
  const seed = hashString(tip.id);

  const entries: BookmakerOddsEntry[] = BOOKMAKERS.map((bookie, i) => {
    let odds = Math.round((base + spreadFor(seed, i)) * 100) / 100;
    odds = Math.max(1.01, odds);
    return {
      bookmaker: bookie.name,
      odds,
      url: buildAffiliateUrl(bookie.name, bookie.url, tip, odds),
      isBest: false,
    };
  });

  const best = entries.reduce((a, b) => (b.odds > a.odds ? b : a));
  best.isBest = true;

  return { tipId: tip.id, baseOdds: base, best, bookmakers: entries };
}
