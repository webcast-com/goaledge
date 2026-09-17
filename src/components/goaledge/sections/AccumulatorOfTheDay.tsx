"use client";

import { useMemo } from "react";
import { FadeIn } from "@/components/goaledge/animations";
import { Flame, ShieldCheck, Rocket, Ticket } from "lucide-react";
import type { Tip } from "@/types/goaledge";

/* ------------------------------------------------------------------ */
/*  Accumulator builder                                                 */
/*                                                                      */
/*  Accumulators are composed from the live board (the same `tips` the  */
/*  tips grid shows), never hardcoded — so the teams always match what  */
/*  is actually on offer, the combined odds are the real product of the */
/*  legs, and "Add all to slip" adds legs that genuinely exist. The     */
/*  three cards use disjoint matches, so every card carries different   */
/*  teams. Selection is deterministic: same board → same accas.         */
/* ------------------------------------------------------------------ */
interface Acca {
  key: string;
  name: string;
  tagline: string;
  icon: React.ReactNode;
  header: string; // header gradient classes
  numeral: string; // leg number circle classes
  oddsChip: string; // per-leg odds chip classes
  button: string; // add-all button classes
  legs: Tip[];
}

function oddsOf(tip: Tip): number {
  const n = parseFloat(tip.odds);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function matchKey(tip: Tip): string {
  return `${tip.homeTeam}::${tip.awayTeam}`;
}

function buildAccas(tips: Tip[]): Acca[] {
  // Upcoming tips first; fall back to the full board if statuses are absent.
  const pool = tips.filter((t) => !t.status || t.status === "upcoming");
  const used = new Set<string>();

  const take = (
    sorted: Tip[],
    count: number,
  ): Tip[] => {
    const picked: Tip[] = [];
    for (const tip of sorted) {
      if (picked.length >= count) break;
      const key = matchKey(tip);
      if (used.has(key)) continue;
      used.add(key);
      picked.push(tip);
    }
    return picked;
  };

  // Banker = shortest prices first (guaranteed lowest combined odds),
  // tie-broken by confidence, so the three tiers always read correctly.
  const byShortPrice = [...pool].sort(
    (a, b) => oddsOf(a) - oddsOf(b) || b.confidence - a.confidence,
  );
  const banker = take(byShortPrice, 3);

  const remaining = pool.filter((t) => !used.has(matchKey(t)));
  const byBalanced = [...remaining].sort(
    (a, b) => Math.abs(oddsOf(a) - 1.85) - Math.abs(oddsOf(b) - 1.85),
  );
  const value = take(byBalanced, 3);

  const byLong = [...pool]
    .filter((t) => !used.has(matchKey(t)))
    .sort((a, b) => oddsOf(b) - oddsOf(a));
  const longshot = take(byLong, 3);

  return [
    {
      key: "banker",
      name: "Banker Acca",
      tagline: "Shortest prices on the board",
      icon: <ShieldCheck className="h-5 w-5" />,
      header: "bg-gradient-to-r from-emerald-600 to-teal-600",
      numeral: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
      oddsChip: "text-emerald-600 ring-emerald-200 dark:text-emerald-400 dark:ring-emerald-800",
      button: "bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-emerald-500/20 hover:from-emerald-500 hover:to-emerald-700 hover:shadow-emerald-500/40",
      legs: banker,
    },
    {
      key: "value",
      name: "Value Acca",
      tagline: "Balanced price and probability",
      icon: <Flame className="h-5 w-5" />,
      header: "bg-gradient-to-r from-amber-600 to-orange-600",
      numeral: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
      oddsChip: "text-amber-600 ring-amber-200 dark:text-amber-400 dark:ring-amber-800",
      button: "bg-gradient-to-b from-amber-500 to-orange-500 shadow-amber-500/20 hover:from-amber-500 hover:to-orange-600 hover:shadow-amber-500/40",
      legs: value,
    },
    {
      key: "longshot",
      name: "Longshot Acca",
      tagline: "Bigger odds, bigger thrill",
      icon: <Rocket className="h-5 w-5" />,
      header: "bg-gradient-to-r from-sky-600 to-cyan-600",
      numeral: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400",
      oddsChip: "text-sky-600 ring-sky-200 dark:text-sky-400 dark:ring-sky-800",
      button: "bg-gradient-to-b from-sky-500 to-sky-600 shadow-sky-500/20 hover:from-sky-500 hover:to-sky-700 hover:shadow-sky-500/40",
      legs: longshot,
    },
  ].filter((a) => a.legs.length >= 2);
}

export function AccumulatorOfTheDay({
  tips,
  onAddToSlip,
}: {
  tips: Tip[];
  onAddToSlip: (tip: Tip) => void;
}) {
  const accas = useMemo(() => buildAccas(tips), [tips]);

  if (accas.length === 0) return null;

  return (
    <section className="bg-white px-4 py-16 sm:px-6 dark:bg-slate-900/70">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-800">
              <Flame className="h-3.5 w-3.5" /> Hot picks
            </span>
            <h2 className="section-heading mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Today&apos;s accumulators
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Three ready-built combos from today&apos;s board — different
              teams, different risk levels. Add any of them in one click.
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-5 lg:grid-cols-3">
          {accas.map((acca, accaIndex) => {
            const combinedOdds = acca.legs.reduce(
              (acc, leg) => acc * oddsOf(leg),
              1,
            );
            const potentialReturn = Math.round(combinedOdds * 100);
            return (
              <FadeIn key={acca.key} delay={0.1 + accaIndex * 0.08}>
                <div className="acca-card-hover flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/50 to-white dark:border-slate-700 dark:from-slate-900 dark:to-slate-900">
                  {/* Acca header */}
                  <div className={`flex items-center justify-between px-5 py-3.5 text-white ${acca.header}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      {acca.icon}
                      <div className="min-w-0">
                        <p className="truncate font-bold">{acca.name}</p>
                        <p className="truncate text-[11px] text-white/85">{acca.tagline}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-white/85">{acca.legs.length}-Fold</p>
                      <p className="text-xl font-extrabold tabular-nums">{combinedOdds.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Legs */}
                  <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800">
                    {acca.legs.map((leg, i) => (
                      <div key={leg.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${acca.numeral}`}>
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {leg.flag} {leg.homeTeam} vs {leg.awayTeam}
                          </p>
                          <p className="text-xs text-slate-400">
                            {leg.league} · {leg.prediction}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-lg bg-white px-2 py-1 text-sm font-bold ring-1 tabular-nums dark:bg-slate-800 ${acca.oddsChip}`}>
                          {leg.odds}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer with potential return */}
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Returns Ksh 100 stake</p>
                      <p className="text-xl font-extrabold text-emerald-600 tabular-nums dark:text-emerald-400">
                        Ksh {potentialReturn.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => acca.legs.forEach((leg) => onAddToSlip(leg))}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 ${acca.button}`}
                    >
                      <Ticket className="h-4 w-4" /> Add all
                    </button>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
