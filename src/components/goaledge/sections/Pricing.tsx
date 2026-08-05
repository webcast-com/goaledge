"use client";

import { FadeIn } from "@/components/goaledge/animations";
import { Crown, Flame, ArrowRight } from "lucide-react";

export function Pricing({
  onSetAuthMode,
  onSetAuthOpen,
  onSetPaymentOpen,
}: {
  onSetAuthMode: (m: "signin" | "signup") => void;
  onSetAuthOpen: (v: boolean) => void;
  onSetPaymentOpen: (v: boolean) => void;
}) {
  return (
    <section
      id="pricing"
      className="scroll-mt-16 mx-auto max-w-6xl px-4 py-16 sm:px-6"
    >
      <FadeIn>
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <Crown className="h-3.5 w-3.5" /> Pricing
          </span>
          <h2 className="section-heading mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400">
            Start free. Upgrade to premium when you&apos;re ready.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 lg:grid-cols-2">
          {/* Free */}
          <div className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-slate-600">
            <h3 className="font-bold text-slate-900 dark:text-slate-50">
              Free
            </h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                Free
              </span>
              <span className="text-sm text-slate-400">forever</span>
            </div>
            <ul className="mt-5 flex-1 space-y-3">
              {[
                { text: "3 free daily tips", icon: "🎯" },
                { text: "Basic match predictions", icon: "📊" },
                { text: "Community access", icon: "👥" },
                { text: "Weekly performance recap", icon: "📈" },
              ].map((item) => (
                <li
                  key={item.text}
                  className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs dark:bg-emerald-900/30">
                    {item.icon}
                  </span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <button
                onClick={() => { onSetAuthMode("signup"); onSetAuthOpen(true); }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-emerald-500/10 active:translate-y-px dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-600 dark:hover:bg-slate-700"
              >
                Get started free
              </button>
              <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
                No credit card required
              </p>
            </div>
          </div>

          {/* Premium */}
          <div className="premium-card-glow relative flex flex-col rounded-2xl border-2 border-emerald-300 bg-white p-7 shadow-sm ring-1 ring-emerald-200/50 transition-all hover:shadow-lg dark:border-emerald-600 dark:ring-emerald-500/30 dark:bg-slate-900">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-1 text-[11px] font-bold text-white shadow-md shadow-emerald-500/30">
                <Flame className="h-3 w-3" /> Most Popular
              </span>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-50">
              Premium 24hr
            </h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                Ksh&nbsp;100
              </span>
              <span className="text-sm font-medium text-slate-400">/24hr</span>
            </div>
            <ul className="mt-5 flex-1 space-y-3">
              {[
                { text: "Unlimited premium tips for 24 hours", icon: "⚡" },
                { text: "In-depth match analysis", icon: "🔬" },
                { text: "High-value accumulator picks", icon: "🎯" },
                { text: "Real-time odds alerts", icon: "🔔" },
                { text: "Priority email support", icon: "💬" },
                { text: "Staking calculator", icon: "🧮" },
              ].map((item) => (
                <li
                  key={item.text}
                  className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs dark:bg-emerald-900/30">
                    {item.icon}
                  </span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <button
                onClick={() => { onSetPaymentOpen(true); }}
                className="h-11 w-full rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-5 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition-all hover:from-emerald-500 hover:to-emerald-700 hover:shadow-emerald-500/40 hover:-translate-y-px active:translate-y-0"
              >
                Upgrade to Premium
                <ArrowRight className="ml-1 h-4 w-4" />
              </button>
              <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
                Cancel anytime · 1-day pass, no subscription
              </p>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}