"use client";

import { FadeIn } from "@/components/goaledge/animations";
import { RefreshCw } from "lucide-react";
import type { LiveScore } from "@/types/goaledge";

export function LiveScoresSection({
  liveScores,
  lastRefreshed,
  onRefresh,
}: {
  liveScores: LiveScore[];
  lastRefreshed: string;
  onRefresh: () => void;
}) {
  return (
    <section id="live-scores" className="scroll-mt-16 relative border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white px-4 py-12 sm:px-6 dark:border-slate-800 dark:from-slate-900/40 dark:to-slate-900/20">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="mb-5 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="live-pulse absolute inline-flex h-full w-full rounded-full bg-red-500" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Live Matches</h2>
            <span className="odds-live-dot ml-2 flex h-2 w-2 items-center justify-center rounded-full bg-emerald-500 text-emerald-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {liveScores.length} LIVE
            </span>
            {lastRefreshed && (
              <button
                onClick={onRefresh}
                className="ml-auto text-[10px] text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                title="Refresh live scores"
              >
                <RefreshCw className="mr-1 inline h-3 w-3" />
                {lastRefreshed}
              </button>
            )}
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {liveScores.map((match) => (
              <div
                key={match.id}
                className="live-score-card group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-red-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-red-800"
              >
                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                  <span>{match.flag}</span>
                  <span className="font-medium">{match.league}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex flex-col items-center gap-1">
                    {match.homeTeamCrest ? (
                      <img src={match.homeTeamCrest} alt="" className="h-6 w-6 object-contain" />
                    ) : (
                      <span className="text-lg">{match.flag}</span>
                    )}
                    <p className="max-w-[70px] text-center text-[11px] font-medium leading-tight text-slate-600 dark:text-slate-300">{match.homeTeam}</p>
                    <p className={`text-2xl font-extrabold tabular-nums ${match.homeScore > match.awayScore ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>{match.homeScore}</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {match.minute}
                    </span>
                    <span className="mt-1 text-[10px] font-medium text-slate-400">LIVE</span>
                    {match.homeScore > match.awayScore && (
                    <span className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                      ⚽ {match.homeScore - match.awayScore} goal lead
                    </span>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    {match.awayTeamCrest ? (
                      <img src={match.awayTeamCrest} alt="" className="h-6 w-6 object-contain" />
                    ) : (
                      <span className="text-lg">{match.flag}</span>
                    )}
                    <p className="max-w-[70px] text-center text-[11px] font-medium leading-tight text-slate-600 dark:text-slate-300">{match.awayTeam}</p>
                    <p className={`text-2xl font-extrabold tabular-nums ${match.awayScore > match.homeScore ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>{match.awayScore}</p>
                  </div>
                </div>
                {/* Match progress bar */}
                <div className="mt-3">
                  <div className="match-progress">
                    <div className="match-progress-fill" style={{ width: `${(parseInt(match.minute) / 90) * 100}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[9px] text-slate-300 dark:text-slate-600">
                    <span>0&apos;</span>
                    <span>HT</span>
                    <span>90&apos;</span>
                  </div>
                </div>
                {/* Mini in-play stats */}
                <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                  <span>⚽ {match.possession}</span>
                  <span className="h-2.5 w-px bg-slate-200 dark:bg-slate-700" />
                  <span>🎯 {match.shots}</span>
                  <span className="h-2.5 w-px bg-slate-200 dark:bg-slate-700" />
                  <span>🚩 {match.corners}</span>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}