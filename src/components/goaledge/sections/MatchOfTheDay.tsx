"use client";

import { FadeIn } from "@/components/goaledge/animations";
import { Radio, ArrowRight, Ticket, Eye } from "lucide-react";
import { toast } from "sonner";
import type { Tip } from "@/types/goaledge";
import { MatchCountdown } from "../MatchCountdown";

export function MatchOfTheDay({
  tips,
  onAddToSlip,
}: {
  tips: Tip[];
  onAddToSlip: (tip: Tip) => void;
}) {
  return (
    <section className="border-b border-slate-200 bg-white px-4 py-16 sm:px-6 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mx-auto max-w-4xl">
        <FadeIn>
          <div className="mb-6 text-center">
            <span className="section-badge inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Radio className="h-3.5 w-3.5" /> Featured Match
            </span>
            <h2 className="section-heading mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Match of the Day
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Our analysts&apos; top pick with in-depth breakdown.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="spotlight-card overflow-hidden rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-white via-emerald-50/30 to-white p-1 dark:border-emerald-800/60 dark:from-slate-800 dark:via-emerald-950/20 dark:to-slate-800">
            <div className="rounded-[20px] overflow-hidden">
              {/* Match header */}
              <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-50" aria-hidden="true" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-emerald-100">
                    <span>🇮🇹 Serie A · Today 21:45</span>
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm">LIVE ON TV</span>
                  </div>
                  <div className="odds-boost-badge rounded-full px-3 py-1 text-[11px] font-extrabold text-white shadow-md">
                    🔥 Odds Boost Applied
                  </div>
                </div>
              </div>

              {/* Teams */}
              <div className="bg-white px-6 py-8 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-900 to-blue-700 text-2xl font-black text-white shadow-lg">IM</div>
                    <p className="mt-3 text-lg font-bold text-slate-900 dark:text-white">Inter Milan</p>
                    <p className="text-xs text-slate-400">2nd · 62 pts</p>
                    <div className="mt-2 flex justify-center gap-1">
                      {["W","W","D","W","W"].map((r, i) => (
                        <span key={i} className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-white ${r === "W" ? "bg-emerald-500" : r === "L" ? "bg-red-500" : "bg-amber-500"}`}>{r}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2 px-6">
                    <div className="rounded-xl bg-slate-100 px-4 py-2 dark:bg-slate-800">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">vs</p>
                    </div>
                    <MatchCountdown matchTime="19 Jul, 21:45" />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-2xl font-black text-white shadow-lg">JUV</div>
                    <p className="mt-3 text-lg font-bold text-slate-900 dark:text-white">Juventus</p>
                    <p className="text-xs text-slate-400">4th · 52 pts</p>
                    <div className="mt-2 flex justify-center gap-1">
                      {["D","W","L","W","D"].map((r, i) => (
                        <span key={i} className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-white ${r === "W" ? "bg-emerald-500" : r === "L" ? "bg-red-500" : "bg-amber-500"}`}>{r}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Key stats comparison */}
                <div className="mt-8 grid grid-cols-3 gap-3">
                  {[
                    { label: "xG (Last 5)", home: "2.4", away: "1.2", homeHigher: true },
                    { label: "Goals Scored", home: "11", away: "6", homeHigher: true },
                    { label: "Clean Sheets", home: "3", away: "2", homeHigher: true },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center dark:border-slate-800 dark:bg-slate-800/50">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{stat.label}</p>
                      <div className="mt-1.5 flex items-center justify-center gap-2">
                        <span className={`text-sm font-bold ${stat.homeHigher ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>{stat.home}</span>
                        <span className="text-xs text-slate-300 dark:text-slate-600">-</span>
                        <span className={`text-sm font-bold ${!stat.homeHigher ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>{stat.away}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Prediction */}
                <div className="mt-6 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Our Prediction</p>
                    <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">Double Chance: Home/Draw</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Inter dominant at home · Juventus struggling on road</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                      <span className="line-through opacity-85">1.35</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                    <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">1.40</p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">BOOSTED</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => {
                      const spotlightTip = tips.find(t => t.homeTeam === "Inter Milan" && t.awayTeam === "Juventus");
                      if (spotlightTip) onAddToSlip(spotlightTip);
                      else toast.success("Inter Milan vs Juventus added to slip!");
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Ticket className="h-4 w-4" /> Add to Bet Slip
                  </button>
                  <button
                    onClick={() => toast.info("Full analysis available for Premium members")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-600"
                  >
                    <Eye className="h-4 w-4" /> Full Analysis
                  </button>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
      {/* contrast-audit-ignore: decorative section-divider wave (SVG fill, not text) */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none -mb-px">
        <svg viewBox="0 0 1200 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-8 text-slate-50 dark:text-slate-900/60" preserveAspectRatio="none">
          <path d="M0 40V20C200 0 400 40 600 20C800 0 1000 40 1200 20V40H0Z" fill="currentColor"/>
        </svg>
      </div>
    </section>
  );
}