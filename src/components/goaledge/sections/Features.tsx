"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "@/components/goaledge/animations";
import {
  Zap,
  ChartColumn,
  Earth,
  ShieldCheck,
  BarChart3,
  Link2,
} from "lucide-react";
import { FeatureCard } from "../FeatureCard";

export function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-16 bg-white px-4 py-16 sm:px-6 dark:bg-slate-900/70"
    >
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Zap className="h-3.5 w-3.5" /> Why GoalEdge
            </span>
            <h2 className="section-heading mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Everything you need to bet with confidence
            </h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400">
              A complete toolkit for serious football fans and punters alike.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" staggerDelay={0.1}>
          {[
            {
              icon: <ChartColumn className="h-5 w-5" />,
              title: "Data-driven tips",
              desc: "Every pick is backed by form, head-to-head records and expected-goals analysis.",
            },
            {
              icon: <Zap className="h-5 w-5" />,
              title: "Real-time odds",
              desc: "Fresh odds and value alerts the moment markets move across major bookmakers.",
            },
            {
              icon: <Earth className="h-5 w-5" />,
              title: "10+ top leagues",
              desc: "From the Premier League to the NPFL — coverage across Europe and beyond.",
            },
            {
              icon: <ShieldCheck className="h-5 w-5" />,
              title: "Secure payments",
              desc: "Upgrade instantly with Paystack. Bank-grade encryption on every transaction.",
            },
            {
              icon: <BarChart3 className="h-5 w-5" />,
              title: "Performance tracking",
              desc: "Track your betting history, P&L, and win rate with detailed analytics dashboards.",
            },
            {
              icon: <Link2 className="h-5 w-5" />,
              title: "Accumulator builder",
              desc: "Build custom accumulators with combined odds calculator and one-click slip integration.",
            },
          ].map((f) => (
            <StaggerItem key={f.title}>
              <FeatureCard
                icon={f.icon}
                title={f.title}
                description={f.desc}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}