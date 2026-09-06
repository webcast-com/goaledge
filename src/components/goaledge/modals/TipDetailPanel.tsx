"use client";

import { useState } from "react";
import { Tip } from "@/types/goaledge";
import {
  Crown,
  Clock,
  Flame,
  Star,
  Copy,
  Share2,
  X,
  BarChart3,
  Users,
  Sparkles,
  Target,
  Medal,
  ChartColumn,
  Lock,
  Radio,
  AlertTriangle,
  TrendingUp,
  Ticket,
} from "lucide-react";
import { generateAnalysis } from "@/lib/generate-analysis";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/goaledge/animations";
import { MatchCountdown } from "@/components/goaledge/MatchCountdown";

export function TipDetailPanel({
  tip,
  betSlipIds,
  isPremium,
  onClose,
  onAddToSlip,
  onCopy,
  onShare,
  isBookmarked,
  onToggleBookmark,
  onUpgrade,
  allTips,
}: {
  tip: Tip;
  betSlipIds: Set<string>;
  isPremium: boolean;
  onClose: () => void;
  onAddToSlip: () => void;
  onCopy: () => void;
  onShare: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onUpgrade: () => void;
  allTips: Tip[];
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "stats" | "analysis" | "markets">("overview");
  const [stakeInput, setStakeInput] = useState("100");
  const oddsNum = parseFloat(tip.odds) || 0;
  const potentialReturn = (oddsNum * (parseFloat(stakeInput) || 0)).toFixed(0);
  const inSlip = betSlipIds.has(tip.id);
  const locked = tip.isPremium && !isPremium;

  // Simulated xG data
  const homeXg = (1.2 + Math.random() * 1.3).toFixed(2);
  const awayXg = (0.5 + Math.random() * 1.2).toFixed(2);
  const homePossession = 45 + Math.floor(Math.random() * 20);
  const awayPossession = 100 - homePossession;
  const homeShots = 8 + Math.floor(Math.random() * 8);
  const awayShots = 5 + Math.floor(Math.random() * 6);
  const homeCorners = 3 + Math.floor(Math.random() * 5);
  const awayCorners = 2 + Math.floor(Math.random() * 4);

  // Related tips
  const relatedTips = allTips.filter(t => t.id !== tip.id && t.league === tip.league).slice(0, 3);

  // Market tabs
  const markets = [
    { label: "1X2", home: tip.odds, draw: (oddsNum * 2.5).toFixed(2), away: (oddsNum * 3).toFixed(2) },
    { label: "Over/Under 2.5", home: (oddsNum * 0.8).toFixed(2), draw: "—", away: (oddsNum * 1.1).toFixed(2) },
    { label: "BTTS", home: (oddsNum * 0.9).toFixed(2), draw: "—", away: (oddsNum * 0.85).toFixed(2) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel - slides from bottom on mobile, from right on desktop */}
      <div className="tip-detail-panel relative flex w-full flex-col bg-white dark:bg-slate-900 sm:mx-auto sm:my-0 sm:max-w-2xl sm:rounded-l-2xl sm:shadow-2xl lg:max-w-3xl">
        {/* Drag handle for mobile */}
        <div className="flex items-center justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Sticky Header */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-4 text-white sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{tip.flag}</span>
                <p className="text-xs font-medium text-emerald-200 truncate">{tip.league} · {tip.country}</p>
                {tip.isPremium && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-200 ring-1 ring-amber-400/30">
                    <Crown className="h-2.5 w-2.5" /> PRO
                  </span>
                )}
              </div>
              <h2 className="mt-1.5 text-lg font-bold sm:text-xl truncate">
                {tip.homeTeam} <span className="font-normal text-emerald-200">vs</span> {tip.awayTeam}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-emerald-200">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{tip.matchTime}</span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-50">
                  {tip.status === "upcoming" ? "Upcoming" : tip.status.charAt(0).toUpperCase() + tip.status.slice(1)}
                </span>
                <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-300" />{tip.tipster}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button onClick={onToggleBookmark} className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${isBookmarked ? "bg-amber-400/20 text-amber-200" : "bg-white/10 text-white/70 hover:bg-white/20"}`}>
                <Star className={`h-4 w-4 ${isBookmarked ? "fill-amber-300" : ""}`} />
              </button>
              <button onClick={onCopy} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/70 transition hover:bg-white/20">
                <Copy className="h-4 w-4" />
              </button>
              <button onClick={onShare} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/70 transition hover:bg-white/20">
                <Share2 className="h-4 w-4" />
              </button>
              <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/70 transition hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick stats bar */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/10 p-2.5 text-center">
              <p className="text-[10px] font-medium text-emerald-200">Prediction</p>
              <p className="mt-0.5 text-xs font-bold truncate">{tip.predictionType}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-2.5 text-center">
              <p className="text-[10px] font-medium text-emerald-200">Odds</p>
              <p className="mt-0.5 text-lg font-extrabold tabular-nums">{tip.odds}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-2.5 text-center">
              <p className="text-[10px] font-medium text-emerald-200">Confidence</p>
              <p className="mt-0.5 text-sm font-bold">{tip.confidence}%</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Premium Lock Overlay */}
          {locked && (
            <div className="relative">
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-slate-900/80" />
            </div>
          )}

          {/* Tabs */}
          <div className="sticky top-0 z-[5] border-b border-slate-100 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
            <div className="-mb-px flex gap-1 overflow-x-auto no-scrollbar">
              {(["overview", "stats", "analysis", "markets"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative shrink-0 px-4 py-3 text-xs font-semibold capitalize transition-colors ${
                    activeTab === tab
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-emerald-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Prediction Card */}
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 dark:border-slate-700 dark:from-slate-800/50 dark:to-slate-900">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{tip.predictionType}</p>
                  <p className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">{tip.prediction}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-xl bg-emerald-100 px-4 py-2 text-xl font-black text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">{tip.odds}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-medium text-slate-400 uppercase">Potential Return</p>
                      <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">Ksh {Number(potentialReturn).toLocaleString()}</p>
                    </div>
                  </div>
                  {/* Quick stake input */}
                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-400">Stake:</label>
                    <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
                      <span className="text-xs text-slate-400">Ksh</span>
                      <input type="number" value={stakeInput} onChange={e => setStakeInput(e.target.value)} className="w-full bg-transparent text-sm font-bold tabular-nums text-slate-900 outline-none dark:text-white" min="0" />
                    </div>
                    {[50, 100, 200, 500].map(a => (
                      <button key={a} onClick={() => setStakeInput(String(a))} className="rounded-lg bg-slate-100 px-2 py-1.5 text-[10px] font-bold text-slate-600 transition hover:bg-emerald-100 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-400">{a}</button>
                    ))}
                  </div>
                </div>

                {/* Confidence */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Confidence Rating</span>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">{tip.confidence}% · {tip.confidenceLabel}</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="confidence-bar h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" style={{ width: `${tip.confidence}%` }} />
                  </div>
                </div>

                {/* Form Guide */}
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <BarChart3 className="h-4 w-4 text-emerald-500" />
                    Recent Form
                  </h4>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {[{ name: tip.homeTeam, form: tip.homeForm, isHome: true }, { name: tip.awayTeam, form: tip.awayForm, isHome: false }].map((team) => (
                      <div key={team.name} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white ${team.isHome ? "bg-emerald-500" : "bg-sky-500"}`}>{team.isHome ? "H" : "A"}</span>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{team.name}</p>
                        </div>
                        <div className="mt-3 flex gap-1.5">
                          {(team.form ?? []).map((r, i) => (
                            <div key={i} className={`flex h-8 w-8 flex-col items-center justify-center rounded-lg text-[11px] font-bold text-white ${r === "W" ? "bg-emerald-500" : r === "L" ? "bg-red-500" : "bg-amber-500"}`}>
                              <span>{r}</span>
                            </div>
                          ))}
                        </div>
                        <p className="mt-2 text-[10px] text-slate-400">{(team.form ?? []).filter(r => r === "W").length}/{(team.form ?? []).length} wins</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Head to Head */}
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Users className="h-4 w-4 text-emerald-500" />
                    Head to Head
                  </h4>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-600 dark:text-slate-300">{tip.headToHead}</p>
                    {/* H2H visual */}
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-white p-3 dark:bg-slate-800">
                      <div className="text-center">
                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">3</p>
                        <p className="text-[10px] text-slate-400">Home Wins</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-black text-slate-400">2</p>
                        <p className="text-[10px] text-slate-400">Draws</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-black text-sky-500">1</p>
                        <p className="text-[10px] text-slate-400">Away Wins</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Related Tips */}
                {relatedTips.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                      More from {tip.league}
                    </h4>
                    <div className="mt-3 space-y-2">
                      {relatedTips.map(rt => (
                        <div key={rt.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/30">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{rt.homeTeam} vs {rt.awayTeam}</p>
                            <p className="text-xs text-slate-400">{rt.prediction} · {rt.odds}</p>
                          </div>
                          <span className={`ml-2 rounded-lg px-2 py-1 text-xs font-bold ${rt.status === "won" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"}`}>
                            {rt.status.charAt(0).toUpperCase() + rt.status.slice(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STATS TAB */}
            {activeTab === "stats" && (
              <div className="space-y-6">
                {/* xG Comparison */}
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Target className="h-4 w-4 text-emerald-500" />
                    Expected Goals (xG)
                  </h4>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{homeXg}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{tip.homeTeam}</p>
                      </div>
                      <div className="text-center text-sm font-bold text-slate-300 dark:text-slate-600">vs</div>
                      <div className="text-center">
                        <p className="text-3xl font-black text-sky-500">{awayXg}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{tip.awayTeam}</p>
                      </div>
                    </div>
                    {/* Visual bar */}
                    <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div className="rounded-l-full bg-emerald-500 transition-all" style={{ width: `${(parseFloat(homeXg) / (parseFloat(homeXg) + parseFloat(awayXg))) * 100}%` }} />
                      <div className="rounded-r-full bg-sky-500 transition-all" style={{ width: `${(parseFloat(awayXg) / (parseFloat(homeXg) + parseFloat(awayXg))) * 100}%` }} />
                    </div>
                    <p className="mt-2 text-center text-[11px] text-slate-400">Combined xG: {(parseFloat(homeXg) + parseFloat(awayXg)).toFixed(2)}</p>
                  </div>
                </div>

                {/* Possession & Shots */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-400">Avg Possession</p>
                    <div className="mt-3 flex items-center justify-between text-sm font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400">{homePossession}%</span>
                      <span className="text-sky-500">{awayPossession}%</span>
                    </div>
                    <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="rounded-l-full bg-emerald-500" style={{ width: `${homePossession}%` }} />
                      <div className="rounded-r-full bg-sky-500" style={{ width: `${awayPossession}%` }} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-400">Avg Shots/Game</p>
                    <div className="mt-3 flex items-center justify-between text-sm font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400">{homeShots}</span>
                      <span className="text-sky-500">{awayShots}</span>
                    </div>
                    <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="rounded-l-full bg-emerald-500" style={{ width: `${(homeShots / (homeShots + awayShots)) * 100}%` }} />
                      <div className="rounded-r-full bg-sky-500" style={{ width: `${(awayShots / (homeShots + awayShots)) * 100}%` }} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-400">Avg Corners</p>
                    <div className="mt-3 flex items-center justify-between text-sm font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400">{homeCorners}</span>
                      <span className="text-sky-500">{awayCorners}</span>
                    </div>
                    <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="rounded-l-full bg-emerald-500" style={{ width: `${(homeCorners / (homeCorners + awayCorners)) * 100}%` }} />
                      <div className="rounded-r-full bg-sky-500" style={{ width: `${(awayCorners / (homeCorners + awayCorners)) * 100}%` }} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-400">Clean Sheets</p>
                    <div className="mt-3 flex items-center justify-between text-sm font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400">{(tip.homeForm ?? []).filter(r => r === "W").length}</span>
                      <span className="text-sky-500">{(tip.awayForm ?? []).filter(r => r === "W").length}</span>
                    </div>
                    <p className="mt-2 text-[10px] text-slate-400">Last 5 matches</p>
                  </div>
                </div>

                {/* League Table Position */}
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Medal className="h-4 w-4 text-emerald-500" />
                    League Position
                  </h4>
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-400">#</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-400">Team</th>
                          <th className="px-3 py-2.5 text-center font-semibold text-slate-400">P</th>
                          <th className="px-3 py-2.5 text-center font-semibold text-slate-400">W</th>
                          <th className="px-3 py-2.5 text-center font-semibold text-slate-400">D</th>
                          <th className="px-3 py-2.5 text-center font-semibold text-slate-400">L</th>
                          <th className="px-4 py-2.5 text-right font-semibold text-slate-400">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { pos: 3, name: tip.homeTeam, p: 28, w: 17, d: 6, l: 5, pts: 57, highlight: true },
                          { pos: 5, name: tip.awayTeam, p: 28, w: 13, d: 8, l: 7, pts: 47, highlight: false },
                          { pos: 1, name: "Team Alpha", p: 28, w: 21, d: 4, l: 3, pts: 67, highlight: false },
                          { pos: 2, name: "Team Beta", p: 28, w: 18, d: 6, l: 4, pts: 60, highlight: false },
                          { pos: 4, name: "Team Gamma", p: 28, w: 15, d: 7, l: 6, pts: 52, highlight: false },
                        ].sort((a, b) => a.pos - b.pos).map((row) => (
                          <tr key={row.pos} className={`border-b border-slate-50 last:border-0 ${row.highlight ? "bg-emerald-50/50 dark:bg-emerald-950/10" : ""}`}>
                            <td className={`px-4 py-2.5 font-bold tabular-nums ${row.pos <= 3 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}>{row.pos}</td>
                            <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200">{row.name}</td>
                            <td className="px-3 py-2.5 text-center tabular-nums text-slate-400">{row.p}</td>
                            <td className="px-3 py-2.5 text-center tabular-nums text-emerald-600 dark:text-emerald-400 font-bold">{row.w}</td>
                            <td className="px-3 py-2.5 text-center tabular-nums text-slate-400">{row.d}</td>
                            <td className="px-3 py-2.5 text-center tabular-nums text-red-500">{row.l}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-bold text-slate-700 dark:text-slate-200">{row.pts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ANALYSIS TAB */}
            {activeTab === "analysis" && (
              <div className="space-y-6">
                {/* Match Analysis */}
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <ChartColumn className="h-4 w-4 text-emerald-500" />
                    Expert Analysis
                  </h4>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/50">
                    {locked ? (
                      <div className="flex flex-col items-center py-8 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
                          <Lock className="h-7 w-7 text-amber-500" />
                        </div>
                        <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">Premium Content</p>
                        <p className="mt-1 max-w-xs text-xs text-slate-400">Unlock in-depth analysis, xG breakdowns, and expert reasoning for this prediction.</p>
                        <button onClick={onUpgrade} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-amber-500/20 transition hover:from-amber-600 hover:to-amber-700">
                          <Crown className="h-4 w-4" /> Unlock for Ksh 100
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{tip.analysis}</p>
                    )}
                  </div>
                </div>

                {/* Key Factors */}
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Radio className="h-4 w-4 text-emerald-500" />
                    Key Factors
                  </h4>
                  <div className="mt-3 space-y-2">
                    {[
                      { label: "Home Advantage", value: tip.homeTeam, strength: 85, positive: true },
                      { label: "Recent Form", value: `${(tip.homeForm ?? []).filter(r => r === "W").length}/5 wins`, strength: 70, positive: true },
                      { label: "Goal Scoring", value: `xG ${homeXg} per game`, strength: 75, positive: true },
                      { label: "Defensive Record", value: `Concedes ${awayXg} xG`, strength: 60, positive: false },
                    ].map((f) => (
                      <div key={f.label} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/30">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{f.label}</p>
                            <p className="text-[10px] text-slate-400">{f.value}</p>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            <div className={`h-full rounded-full ${f.positive ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${f.strength}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Injury/Team News */}
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Team News
                  </h4>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{tip.homeTeam}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {["M. Salah — Doubtful (hamstring)", "V. van Dijk — Out (ankle)"].map(n => (
                          <span key={n} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-[10px] font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />{n}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{tip.awayTeam}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {["J. Saka — Available", "B. Saka — Doubtful (knee)"].map(n => (
                          <span key={n} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-medium ${n.includes("Available") ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${n.includes("Available") ? "bg-emerald-500" : "bg-amber-500"}`} />{n}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MARKETS TAB */}
            {activeTab === "markets" && (
              <div className="space-y-6">
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    Betting Markets
                  </h4>
                  <p className="mt-1 text-xs text-slate-400">Compare odds across different markets</p>
                </div>

                {markets.map((market) => (
                  <div key={market.label} className="rounded-xl border border-slate-200 overflow-hidden dark:border-slate-700">
                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{market.label}</p>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-700">
                      {[
                        { label: tip.homeTeam, odds: market.home },
                        { label: market.label === "1X2" ? "Draw" : "Under / No", odds: market.draw },
                        { label: tip.awayTeam, odds: market.away },
                      ].map((opt, i) => (
                        <button
                          key={opt.label}
                          onClick={() => {
                            if (opt.odds === "—") return;
                            onCopy();
                          }}
                          className={`flex flex-col items-center gap-1 py-4 px-2 transition hover:bg-emerald-50 dark:hover:bg-emerald-950/20 ${i === 0 ? "text-left" : i === 2 ? "text-right" : ""}`}
                        >
                          <span className="text-[10px] font-medium text-slate-400 truncate w-full text-center">{opt.label}</span>
                          <span className={`text-base font-bold tabular-nums ${opt.odds === "—" ? "text-slate-300 dark:text-slate-600" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {opt.odds}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Bookmaker Comparison */}
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mt-2">
                    <BarChart3 className="h-4 w-4 text-emerald-500" />
                    Best Odds Across Bookmakers
                  </h4>
                  <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden dark:border-slate-700">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-400">Bookmaker</th>
                          <th className="px-4 py-2.5 text-right font-semibold text-slate-400">Odds</th>
                          <th className="px-4 py-2.5 text-right font-semibold text-slate-400">Payout</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { book: "1xBet", odds: tip.odds, best: true },
                          { book: "BetKing", odds: (oddsNum - 0.05).toFixed(2), best: false },
                          { book: "SportyBet", odds: (oddsNum + 0.03).toFixed(2), best: true },
                          { book: "Betika", odds: (oddsNum + 0.1).toFixed(2), best: false },
                          { book: "MozzartBet", odds: (oddsNum - 0.02).toFixed(2), best: false },
                        ].sort((a, b) => parseFloat(b.odds) - parseFloat(a.odds)).map((row) => (
                          <tr key={row.book} className={`border-b border-slate-50 last:border-0 ${row.best ? "bg-emerald-50/30 dark:bg-emerald-950/10" : ""}`}>
                            <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{row.book}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">{row.odds}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">Ksh {(parseFloat(stakeInput) * parseFloat(row.odds)).toFixed(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Spacer for sticky footer */}
          <div className="h-24 sm:h-20" />
        </div>

        {/* Sticky Bottom Bar */}
        <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur-xl px-4 py-3 dark:border-slate-700 dark:bg-slate-900/95 sm:px-6">
          {locked ? (
            <button onClick={onUpgrade} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-500 to-amber-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm shadow-amber-500/20 transition hover:from-amber-600 hover:to-amber-700">
              <Crown className="h-4 w-4" />
              Unlock Premium — Ksh 100/day
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={onCopy}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={onAddToSlip}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition ${
                  inSlip
                    ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    : "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:from-emerald-500 hover:to-emerald-700"
                }`}
              >
                <Ticket className="h-4 w-4" />
                {inSlip ? "Already in slip" : `Add to slip — ${tip.odds}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}