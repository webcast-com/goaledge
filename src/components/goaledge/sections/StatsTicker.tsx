"use client";

import {
  Target,
  TrendingUp,
  Users,
  Zap,
  ArrowRight,
} from "lucide-react";
import type { OddsFeedItem } from "@/types/goaledge";

export function StatsTicker({ oddsFeed }: { oddsFeed: OddsFeedItem[] }) {
  return (
    <>
      {/* ==================== STATS TICKER ==================== */}
      <section className="border-y border-slate-200 bg-white py-8 sm:py-10 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            {[
              { label: "Total Predictions", value: "1,247", icon: <Target className="h-5 w-5" />, trend: "+12%", color: "text-emerald-600 dark:text-emerald-400", tooltip: "Total number of tips posted across all leagues since launch" },
              { label: "Win Rate (30d)", value: "53.2%", icon: <TrendingUp className="h-5 w-5" />, trend: "+2.1%", color: "text-emerald-600 dark:text-emerald-400", tooltip: "Percentage of tips that won in the last 30 days" },
              { label: "Active Users", value: "2,841", icon: <Users className="h-5 w-5" />, trend: "+18%", color: "text-emerald-600 dark:text-emerald-400", tooltip: "Users who placed at least one bet in the last 7 days" },
              { label: "Avg. Odds Hit", value: "1.72", icon: <Zap className="h-5 w-5" />, trend: "+0.05", color: "text-emerald-600 dark:text-emerald-400", tooltip: "Average odds of winning tips — higher means more value found" },
            ].map((stat) => (
              <div key={stat.label} className="stat-card-bg group relative text-center rounded-2xl p-5 transition-all hover:shadow-md hover:shadow-emerald-500/5">
                <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-all group-hover:scale-110 group-hover:shadow-md group-hover:shadow-emerald-500/10 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {stat.icon}
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{stat.value}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                <span className={`mt-1.5 inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold ${stat.color} dark:bg-emerald-900/30`}>
                  <TrendingUp className="h-3 w-3" />
                  {stat.trend}
                </span>
                {/* Tooltip on hover */}
                <div className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-slate-700">
                  {stat.tooltip}
                  <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-800 dark:bg-slate-700" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== LIVE ODDS FEED ==================== */}
      {oddsFeed.length > 0 && (
        <div className="border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="live-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-500" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Odds Live
              </span>
              <div className="mx-2 h-4 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
              {oddsFeed.slice(0, 5).map((item, i) => (
                <span key={`${item.matchId}-${item.timestamp}-${i}`} className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${item.direction === "up" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"}`}>
                  <TrendingUp className={`h-3 w-3 ${item.direction === "down" ? "rotate-180" : ""}`} />
                  <span className="font-semibold">{item.homeTeam}</span>
                  <span className="odds-value tabular-nums">{item.oldOdds}</span>
                  <ArrowRight className="h-3 w-3 opacity-50" />
                  <span className="odds-value font-bold tabular-nums">{item.newOdds}</span>
                  <span className="text-[10px] opacity-60">{item.bookmaker}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== LEAGUE MARQUEE ==================== */}
      <div className="overflow-hidden border-b border-slate-200 bg-slate-50 py-3 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="marquee-fade-left marquee-fade-right">
          <div className="marquee-track flex gap-8 animate-marquee">
            {["Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1", "NPFL", "Eredivisie", "Primeira Liga", "Champions League", "Europa League"].map((league) => (
              <span key={league} className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-400 dark:text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {league}
              </span>
            ))}
            {/* Duplicate for seamless loop */}
            {["Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1", "NPFL", "Eredivisie", "Primeira Liga", "Champions League", "Europa League"].map((league) => (
              <span key={`dup-${league}`} className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-400 dark:text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {league}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}