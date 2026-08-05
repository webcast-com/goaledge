"use client";

import { FadeIn } from "@/components/goaledge/animations";
import { ChartColumn } from "lucide-react";

export function WeeklyPerformance() {
  return (
    <section className="border-b border-slate-200 bg-white px-4 py-16 sm:px-6 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mx-auto max-w-4xl">
        <FadeIn>
          <div className="mb-8 text-center">
            <span className="section-badge inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950/30 dark:text-violet-400">
              <ChartColumn className="h-3.5 w-3.5" /> Performance
            </span>
            <h2 className="section-heading mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              This week&apos;s performance
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Daily accuracy over the last 7 days.
            </p>
          </div>
        </FadeIn>
        <FadeIn delay={0.15}>
          <div className="flex items-end justify-between gap-2 sm:gap-4 h-48 px-2">
            {[
              { day: "Mon", won: 4, total: 6, profit: "+Ksh 1,200" },
              { day: "Tue", won: 5, total: 7, profit: "+Ksh 2,800" },
              { day: "Wed", won: 2, total: 5, profit: "-Ksh 300" },
              { day: "Thu", won: 6, total: 6, profit: "+Ksh 3,500" },
              { day: "Fri", won: 3, total: 6, profit: "+Ksh 400" },
              { day: "Sat", won: 5, total: 8, profit: "+Ksh 1,900" },
              { day: "Sun", won: 4, total: 5, profit: "+Ksh 2,100" },
            ].map((d) => {
              const pct = (d.won / d.total) * 100;
              const isProfit = d.profit.startsWith("+");
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-2 group/bar">
                  <span className={`text-[10px] sm:text-xs font-bold tabular-nums ${isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    {d.profit}
                  </span>
                  <div className="relative w-full max-w-[40px] rounded-t-lg bg-slate-100 dark:bg-slate-800" style={{ height: "140px" }}>
                    <div
                      className={`absolute bottom-0 left-0 right-0 rounded-t-lg transition-all duration-700 group-hover/bar:opacity-80 ${
                        pct >= 80
                          ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                          : pct >= 50
                          ? "bg-gradient-to-t from-emerald-500 to-emerald-300"
                          : "bg-gradient-to-t from-red-400 to-red-300"
                      }`}
                      style={{ height: `${(pct / 100) * 140}px` }}
                    />
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover/bar:opacity-100 transition-opacity">
                      {d.won}/{d.total}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">{d.day}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-t from-emerald-600 to-emerald-400" /> 80%+ accuracy</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-t from-emerald-500 to-emerald-300" /> 50-79%</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-t from-red-400 to-red-300" /> Below 50%</span>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}