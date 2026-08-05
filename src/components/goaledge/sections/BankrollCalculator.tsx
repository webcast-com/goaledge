"use client";

import { FadeIn } from "@/components/goaledge/animations";
import { Wallet, BarChart3 } from "lucide-react";

export function BankrollCalculator({
  bankroll,
  onSetBankroll,
}: {
  bankroll: string;
  onSetBankroll: (v: string) => void;
}) {
  return (
    <section className="border-t border-slate-100 bg-slate-50 px-4 py-16 sm:px-6 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mx-auto max-w-4xl">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Wallet className="h-3.5 w-3.5" /> Bankroll Manager
            </span>
            <h2 className="section-heading mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Smart staking calculator
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Enter your bankroll and see recommended stake amounts based on proven strategies.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
            <div className="border-b border-slate-100 p-6 dark:border-slate-700">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <Wallet className="h-4 w-4 text-amber-500" />
                Your Bankroll (Ksh)
              </label>
              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Ksh</span>
                <input
                  type="number"
                  value={bankroll}
                  onChange={(e) => onSetBankroll(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-14 pr-4 text-lg font-extrabold tabular-nums text-slate-900 ring-1 ring-slate-100 transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:ring-slate-800 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/30"
                  min="0"
                  step="1000"
                />
              </div>
              <div className="mt-2 flex gap-2">
                {[5000, 10000, 25000, 50000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => onSetBankroll(String(amt))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-400"
                  >
                    {(amt / 1000).toFixed(0)}K
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Recommended Stakes</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Conservative (1%)", pct: 0.01, desc: "Low risk, steady growth" },
                  { label: "Moderate (2%)", pct: 0.02, desc: "Balanced risk-reward" },
                  { label: "Aggressive (3%)", pct: 0.03, desc: "Higher risk, faster growth" },
                  { label: "High Roller (5%)", pct: 0.05, desc: "Maximum exposure" },
                ].map((plan) => {
                  const planStake = Math.round((parseFloat(bankroll) || 0) * plan.pct);
                  return (
                    <div key={plan.label} className="group rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-slate-200 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/30 dark:hover:border-slate-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{plan.label}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{plan.desc}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">Ksh {planStake.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">per bet</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                        {[1.5, 2.0, 3.0].map((odds) => (
                          <div key={odds} className="flex-1 rounded-lg bg-white p-1.5 text-center dark:bg-slate-800">
                            <p className="text-[9px] font-medium text-slate-400 dark:text-slate-500">@{odds}x</p>
                            <p className="text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-300">Ksh {Math.round(planStake * odds).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800/40 dark:bg-amber-950/10">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                    <BarChart3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Kelly Criterion Suggestion</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      For a tip with 53% implied probability at 1.90 odds, Kelly suggests staking{" "}
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        Ksh {Math.round((parseFloat(bankroll) || 0) * 0.035).toLocaleString()}
                      </span>{" "}
                      (3.5% of bankroll). This maximizes long-term growth while minimizing ruin risk.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}