"use client";

import { FadeIn } from "@/components/goaledge/animations";
import { Medal, Flame } from "lucide-react";
import type { LeaderboardPeriod } from "@/types/goaledge";

export function Leaderboard({
  leaderboardPeriod,
  onSetLeaderboardPeriod,
}: {
  leaderboardPeriod: LeaderboardPeriod;
  onSetLeaderboardPeriod: (v: LeaderboardPeriod) => void;
}) {
  return (
    <section className="border-b border-slate-200 bg-white px-4 py-16 sm:px-6 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mx-auto max-w-4xl">
        <FadeIn>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="section-badge inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                <Medal className="h-3.5 w-3.5" /> Leaderboard
              </span>
              <h2 className="section-heading mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Top Tipsters
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Our best-performing analysts ranked by accuracy and profit.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {(["week", "month", "all"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => onSetLeaderboardPeriod(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all capitalize ${
                    leaderboardPeriod === p
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                      : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-700"
                  }`}
                >
                  {p === "all" ? "All Time" : p}
                </button>
              ))}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-500">
                  <th className="w-10 px-4 py-3 text-center">#</th>
                  <th className="px-4 py-3">Tipster</th>
                  <th className="px-3 py-3 text-center">Tips</th>
                  <th className="px-3 py-3 text-center">Won</th>
                  <th className="px-3 py-3 text-center">Win %</th>
                  <th className="px-3 py-3 text-center">Profit</th>
                  <th className="px-3 py-3 text-center hidden sm:table-cell">Streak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {[
                  { rank: 1, name: "ProAnalyst_K", tips: 347, won: 198, winPct: "57.1%", profit: "+Ksh 84.2K", streak: "12W", badge: "🥇", highlight: true },
                  { rank: 2, name: "DataKing_M", tips: 312, won: 172, winPct: "55.1%", profit: "+Ksh 62.8K", streak: "8W", badge: "🥈", highlight: false },
                  { rank: 3, name: "SafariPick", tips: 289, won: 156, winPct: "54.0%", profit: "+Ksh 51.3K", streak: "6W", badge: "🥉", highlight: false },
                  { rank: 4, name: "NPFLPro", tips: 198, won: 105, winPct: "53.0%", profit: "+Ksh 38.7K", streak: "4W", badge: "4", highlight: false },
                  { rank: 5, name: "GoalLord", tips: 256, won: 134, winPct: "52.3%", profit: "+Ksh 44.1K", streak: "5W", badge: "5", highlight: false },
                ].map((row) => (
                  <tr key={row.rank} className={`table-row-highlight transition-all ${row.highlight ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}`}>
                    <td className="px-4 py-3.5 text-center text-xs">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${row.rank <= 3 ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                        {row.badge}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${row.rank === 1 ? "bg-emerald-500" : row.rank === 2 ? "bg-sky-500" : row.rank === 3 ? "bg-violet-600" : "bg-slate-400"}`}>
                          {row.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.name}</p>
                          {leaderboardPeriod === "month" && <p className="text-[10px] text-slate-400">This month</p>}
                          {leaderboardPeriod === "week" && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">🔥 Hot streak</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center font-medium text-slate-700 dark:text-slate-300">{row.tips}</td>
                    <td className="px-3 py-3.5 text-center font-medium text-emerald-600 dark:text-emerald-400">{row.won}</td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${parseFloat(row.winPct) >= 55 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                        {row.winPct}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400">{row.profit}</td>
                    <td className="px-3 py-3.5 text-center hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                        <Flame className="h-3 w-3" /> {row.streak}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}