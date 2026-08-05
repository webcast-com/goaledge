"use client";

import { FadeIn } from "@/components/goaledge/animations";
import {
  Award,
  CheckCircle2,
  X,
  RefreshCw,
} from "lucide-react";
import type { HistoryFilter } from "@/types/goaledge";

export function TipResults({
  historyFilter,
  historyPeriod,
  onSetHistoryFilter,
  onSetHistoryPeriod,
}: {
  historyFilter: HistoryFilter;
  historyPeriod: "week" | "month" | "all";
  onSetHistoryFilter: (v: HistoryFilter) => void;
  onSetHistoryPeriod: (v: "week" | "month" | "all") => void;
}) {
  return (
    <section id="tip-results" className="scroll-mt-16 border-y border-slate-200 bg-slate-50 px-4 py-16 sm:px-6 dark:border-slate-800 dark:bg-slate-900/30">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Award className="h-3.5 w-3.5" /> Track record
              </span>
              <h2 className="section-heading mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Recent tip results
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Transparency in every prediction — see our recent performance.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">78%</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Last 7 days</p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Filter + Period selectors */}
        <FadeIn delay={0.05}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {(["all", "won", "lost", "void"] as const).map((f) => (
                <button key={f} onClick={() => onSetHistoryFilter(f)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-all ${historyFilter === f ? "bg-emerald-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"}`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-white border border-slate-200 p-1 dark:bg-slate-800 dark:border-slate-700">
              {(["week", "month", "all"] as const).map((p) => (
                <button key={p} onClick={() => onSetHistoryPeriod(p)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${historyPeriod === p ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"}`}>
                  {p === "all" ? "All Time" : p === "week" ? "This Week" : "This Month"}
                </button>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* P&L Summary Row */}
        <FadeIn delay={0.08}>
          <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Staked</p>
              <p className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">Ksh 4,500</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Returns</p>
              <p className="mt-1 text-base font-extrabold text-emerald-600 dark:text-emerald-400">Ksh 7,230</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Net P&L</p>
              <p className="mt-1 text-base font-extrabold text-emerald-600 dark:text-emerald-400">+Ksh 2,730</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">ROI</p>
              <p className="mt-1 text-base font-extrabold text-emerald-600 dark:text-emerald-400">+60.7%</p>
            </div>
          </div>
        </FadeIn>

        {/* Accuracy Trend Sparkline */}
        <FadeIn delay={0.1}>
          <div className="mb-4 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">7-Day Trend</span>
            <div className="flex flex-1 items-end gap-1.5 h-8">
              {[65, 78, 55, 88, 72, 90, 78].map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className={`w-full rounded-sm transition-all ${v >= 70 ? "bg-emerald-500" : v >= 50 ? "bg-amber-400" : "bg-red-400"}`} style={{ height: `${(v / 100) * 32}px` }} />
                  <span className="text-[8px] text-slate-400">{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
                </div>
              ))}
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Avg 75%</span>
          </div>
        </FadeIn>

        {/* Results summary bar */}
        <FadeIn delay={0.12}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex-1 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="result-bar-fill flex h-full">
                <div className="bg-emerald-500" style={{ width: '52%' }} />
                <div className="bg-amber-400" style={{ width: '16%' }} />
                <div className="bg-red-400" style={{ width: '32%' }} />
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Won (52%)</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Void (16%)</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-400" /> Lost (32%)</span>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {[
              { match: "Man City vs Wolves", league: "Premier League", prediction: "Over 2.5 Goals", odds: "1.55", result: "won" as const, time: "Yesterday", analysis: "Both teams averaging 3.2 xG combined. Strong trend." },
              { match: "Real Madrid vs Getafe", league: "La Liga", prediction: "Real Madrid -2 Handicap", odds: "1.80", result: "won" as const, time: "Yesterday", analysis: "Real Madrid dominant at home with 90% win rate." },
              { match: "Atalanta vs Fiorentina", league: "Serie A", prediction: "BTTS - Yes", odds: "1.72", result: "lost" as const, time: "2 days ago", analysis: "Both teams score in 70% of home/away matches." },
              { match: "Bayern vs Augsburg", league: "Bundesliga", prediction: "Bayern to Win", odds: "1.25", result: "won" as const, time: "2 days ago", analysis: "Bayern have won 95% of home matches vs bottom-half teams." },
              { match: "Lille vs Marseille", league: "Ligue 1", prediction: "Under 2.5 Goals", odds: "2.10", result: "void" as const, time: "3 days ago", analysis: "Match abandoned at 60' due to weather." },
              { match: "Riverside vs Plateau Utd", league: "NPFL", prediction: "Double Chance Home/Draw", odds: "1.35", result: "won" as const, time: "3 days ago", analysis: "Riverside unbeaten at home this season." },
              { match: "Arsenal vs Man United", league: "Premier League", prediction: "Arsenal to Win", odds: "1.65", result: "won" as const, time: "4 days ago", analysis: "Arsenal 8-game home winning streak." },
              { match: "Barcelona vs Girona", league: "La Liga", prediction: "Over 3.5 Goals", odds: "2.40", result: "lost" as const, time: "4 days ago", analysis: "High-scoring trend but Girona parked the bus." },
              { match: "Napoli vs Cagliari", league: "Serie A", prediction: "Napoli -1 Handicap", odds: "1.90", result: "won" as const, time: "5 days ago", analysis: "Napoli dominant at home vs relegation contenders." },
              { match: "Dortmund vs Freiburg", league: "Bundesliga", prediction: "BTTS - Yes", odds: "1.68", result: "won" as const, time: "5 days ago", analysis: "Both teams score in 80% of Dortmund home games." },
              { match: "Lyon vs Monaco", league: "Ligue 1", prediction: "Under 2.5 Goals", odds: "1.95", result: "void" as const, time: "6 days ago", analysis: "Match postponed. Bets voided." },
              { match: "Enyimba vs Rangers Int.", league: "NPFL", prediction: "Enyimba to Win", odds: "1.50", result: "lost" as const, time: "6 days ago", analysis: "Upset result despite Enyimba's strong home record." },
            ].filter((r) => historyFilter === "all" || r.result === historyFilter).map((r) => (
              <div key={r.match} className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-all hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 cursor-pointer" title={r.analysis}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  r.result === "won" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" :
                  r.result === "lost" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                }`}>
                  {r.result === "won" ? <CheckCircle2 className="h-4 w-4" /> : r.result === "lost" ? <X className="h-4 w-4" /> : <RefreshCw className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{r.match}</p>
                  <p className="text-xs text-slate-400">{r.league} · {r.prediction}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{r.odds}</span>
                  <p className="mt-0.5 text-[10px] text-slate-400">{r.time}</p>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}