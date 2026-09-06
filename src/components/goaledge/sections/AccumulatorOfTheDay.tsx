"use client";

import { FadeIn } from "@/components/goaledge/animations";
import { Flame, Ticket } from "lucide-react";
import { toast } from "sonner";
import type { Tip } from "@/types/goaledge";

export function AccumulatorOfTheDay({
  tips,
  onAddToSlip,
}: {
  tips: Tip[];
  onAddToSlip: (tip: Tip) => void;
}) {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 dark:bg-slate-900/70">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-800">
              <Flame className="h-3.5 w-3.5" /> Hot pick
            </span>
            <h2 className="section-heading mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Accumulator of the day
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Our best combined picks for maximum value. Add all to your slip in one click.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="acca-card-hover mx-auto max-w-lg overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50/50 to-white dark:border-amber-800/50 dark:from-amber-950/20 dark:to-slate-900">
            {/* Acca header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-3.5 text-white">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5" />
                <span className="font-bold">4-Fold Accumulator</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-amber-100">Combined Odds</p>
                <p className="text-xl font-extrabold tabular-nums">8.47</p>
              </div>
            </div>
            
            {/* Legs */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { match: "Inter Milan vs Juventus", prediction: "Double Chance H/D", odds: "1.40", league: "Serie A", flag: "🇮🇹" },
                { match: "Real Madrid vs Sevilla", prediction: "Real Madrid Win", odds: "1.45", league: "La Liga", flag: "🇪🇸" },
                { match: "Bayern vs Dortmund", prediction: "Over 2.5 Goals", odds: "1.65", league: "Bundesliga", flag: "🇩🇪" },
                { match: "Liverpool vs Brighton", prediction: "Liverpool -1 Handicap", odds: "2.05", league: "Premier League", flag: "🦁" },
              ].map((leg, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{leg.flag} {leg.match}</p>
                    <p className="text-xs text-slate-400">{leg.league} · {leg.prediction}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-sm font-bold text-amber-600 ring-1 ring-amber-200 dark:bg-slate-800 dark:text-amber-400 dark:ring-amber-800">
                    {leg.odds}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Footer with potential return */}
            <div className="flex items-center justify-between border-t border-amber-200 bg-amber-50/50 px-5 py-4 dark:border-amber-800/50 dark:bg-amber-950/10">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Potential return on Ksh 100</p>
                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">Ksh 847</p>
              </div>
              <button
                onClick={() => {
                  tips.filter(t => ["Inter Milan vs Juventus", "Real Madrid vs Sevilla", "Bayern Munich vs Dortmund", "Liverpool vs Brighton"].includes(`${t.homeTeam} vs ${t.awayTeam}`)).forEach(t => onAddToSlip(t));
                  toast.success("All 4 legs added to your bet slip!");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-amber-500/20 transition-all hover:from-amber-500 hover:to-orange-600 hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0"
              >
                <Ticket className="h-4 w-4" /> Add all to slip
              </button>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}