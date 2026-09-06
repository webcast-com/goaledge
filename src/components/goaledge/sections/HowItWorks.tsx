"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "@/components/goaledge/animations";
import {
  Sparkles,
  Users,
  ChartColumn,
  Trophy,
} from "lucide-react";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 relative overflow-hidden border-b border-slate-200 bg-white px-4 py-20 sm:px-6 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mx-auto max-w-5xl">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" /> Simple process
            </span>
            <h2 className="section-heading mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              How it works
            </h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400">
              Three simple steps to start winning with GoalEdge.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="mt-14 grid gap-8 sm:grid-cols-3" staggerDelay={0.15}>
          {[
            {
              step: "01",
              icon: <Users className="h-6 w-6" />,
              title: "Create your account",
              desc: "Sign up for free in seconds. No credit card required. Get instant access to 3 daily tips.",
              color: "from-emerald-400 to-teal-500",
              shadowColor: "shadow-emerald-500/30",
            },
            {
              step: "02",
              icon: <ChartColumn className="h-6 w-6" />,
              title: "Get expert tips",
              desc: "Browse data-driven predictions across 10+ leagues with confidence scores and in-depth analysis.",
              color: "from-teal-400 to-cyan-500",
              shadowColor: "shadow-teal-500/30",
            },
            {
              step: "03",
              icon: <Trophy className="h-6 w-6" />,
              title: "Start winning",
              desc: "Build your bet slip, track results, and upgrade to premium for unlimited tips and analysis.",
              color: "from-cyan-400 to-emerald-500",
              shadowColor: "shadow-cyan-500/30",
            },
          ].map((item, idx) => (
            <StaggerItem key={item.step}>
              <div className="group relative text-center">
                {/* Connecting dashed line (hidden on mobile, between cards) */}
                {idx < 2 && (
                  <div className="hidden sm:block absolute top-10 left-[60%] w-[calc(80%-20%)] z-0">
                    <svg className="step-connector w-full h-1" preserveAspectRatio="none">
                      <line x1="0" y1="0.5" x2="100%" y2="0.5" stroke="#cbd5e1" strokeWidth="2" className="dark:stroke-slate-700" />
                    </svg>
                  </div>
                )}
                <div className={`relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} shadow-lg ${item.shadowColor} transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl`}>
                  <span className="text-white">{item.icon}</span>
                  <span className="absolute -right-1.5 -bottom-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-900 shadow-md ring-1 ring-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
                    {item.step}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-bold text-slate-900 dark:text-slate-50">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{item.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
      {/* contrast-audit-ignore: decorative section-divider wave (SVG fill, not text) */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none -mb-px">
        <svg viewBox="0 0 1200 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-8 text-white dark:text-slate-900/60" preserveAspectRatio="none">
          <path d="M0 40V20C200 0 400 40 600 20C800 0 1000 40 1200 20V40H0Z" fill="currentColor"/>
        </svg>
      </div>
    </section>
  );
}