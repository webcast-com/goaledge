"use client";

import { FadeIn, CountUp } from "@/components/goaledge/animations";
import {
  ArrowRight,
  CheckCircle2,
  Trophy,
  Target,
  Earth,
  Play,
} from "lucide-react";

export function Hero({
  heroScrollY,
  onSetAuthMode,
  onSetAuthOpen,
}: {
  heroScrollY: number;
  onSetAuthMode: (m: "signin" | "signup") => void;
  onSetAuthOpen: (v: boolean) => void;
}) {
  return (
    <>
      {/* ==================== HERO ==================== */}
      <section className="bg-pitch hero-texture relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 sm:pt-28">
        <div className="hero-orb hero-orb-1" aria-hidden="true" style={{ transform: `translateY(${heroScrollY * 0.4}px)` }} />
        <div className="hero-orb hero-orb-2" aria-hidden="true" style={{ transform: `translateY(${heroScrollY * 0.4}px)` }} />
        {/* Animated gradient mesh blobs */}
        <div className="absolute -left-20 -top-20 h-72 w-72 animate-pulse rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" style={{ transform: `translate(${heroScrollY * 0.1}px, ${heroScrollY * 0.2}px)` }} />
        <div className="absolute -right-16 top-10 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl" style={{ animation: "pulse 4s ease-in-out infinite alternate", transform: `translate(${-heroScrollY * 0.15}px, ${heroScrollY * 0.25}px)` }} aria-hidden="true" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 animate-pulse rounded-full bg-emerald-300/8 blur-2xl" style={{ animationDelay: "1s" }} aria-hidden="true" />
        {/* Parallax depth orbs */}
        <div className="absolute left-1/4 top-1/3 h-96 w-96 animate-pulse rounded-full bg-emerald-400/5 blur-3xl" style={{ animation: "pulse 6s ease-in-out infinite alternate", animationDelay: "2s" }} aria-hidden="true" />
        <div className="absolute right-1/4 bottom-1/4 h-64 w-64 animate-pulse rounded-full bg-teal-500/5 blur-2xl" style={{ animation: "pulse 5s ease-in-out infinite alternate-reverse", animationDelay: "1s" }} aria-hidden="true" />
        <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-cyan-400/5 blur-2xl" style={{ animation: "pulse 7s ease-in-out infinite alternate", animationDelay: "3s" }} aria-hidden="true" />
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} aria-hidden="true" />
        {/* Additional noise texture layer */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "256px 256px" }} aria-hidden="true" />

        <div className="relative mx-auto max-w-4xl text-center" style={{ transform: `translateY(${heroScrollY * 0.15}px)`, opacity: Math.max(0, 1 - heroScrollY / 600) }}>
          <FadeIn delay={0.1}>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/25 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm ring-1 ring-emerald-400/40 shadow-lg shadow-emerald-500/10">
              <span className="relative flex h-2.5 w-2.5">
                <span className="live-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-300" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
              </span>
              50% historical hit rate
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            </span>
          </FadeIn>

          <FadeIn delay={0.2}>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Predict smarter.
              <br />
              <span className="gradient-animate bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                Win more often.
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.35}>
            <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-slate-300/90 sm:text-lg">
              Expert predictions, real-time odds &amp; deep analysis — one beautifully simple dashboard.
            </p>
          </FadeIn>

          <FadeIn delay={0.5}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button onClick={() => { onSetAuthMode("signup"); onSetAuthOpen(true); }} className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 text-base font-bold text-emerald-700 shadow-lg shadow-black/10 transition-all hover:bg-emerald-50 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
                Start free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button onClick={() => document.getElementById("tips")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:border-white/50 hover:bg-white/20 hover:-translate-y-0.5 active:translate-y-0">
                <Play className="h-4 w-4" /> Live demo
              </button>
            </div>
          </FadeIn>

          {/* Stats */}
          <FadeIn delay={0.65}>
            <div className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-3 sm:gap-4">
              {[
                { icon: <Trophy className="h-5 w-5 text-emerald-400" />, end: 16, suffix: "%", label: "Win rate" },
                { icon: <Target className="h-5 w-5 text-emerald-400" />, end: 5, suffix: "+", label: "Tips posted" },
                { icon: <Earth className="h-5 w-5 text-emerald-400" />, end: 10, suffix: "+", label: "Leagues" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-5 text-white backdrop-blur-md transition-all hover:border-emerald-400/30 hover:bg-white/10 hover:shadow-lg hover:shadow-emerald-500/10">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    {stat.icon}
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums">
                    <CountUp end={stat.end} suffix={stat.suffix} />
                  </p>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Dashboard Preview Mockup */}
          <FadeIn delay={0.8}>
            <div className="mx-auto mt-16 max-w-3xl" style={{ transform: `translateY(${heroScrollY * 0.3}px)` }}>
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] shadow-2xl shadow-black/20 backdrop-blur-md">
                {/* Mock window chrome */}
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-red-400/80" />
                    <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="rounded-md bg-white/10 px-3 py-1 text-[11px] text-white/50">goaledge.com/dashboard</span>
                  </div>
                </div>
                {/* Mock dashboard content */}
                <div className="grid grid-cols-3 gap-px bg-white/5 p-px">
                  {/* Sidebar */}
                  <div className="col-span-1 space-y-px bg-slate-950/40 p-4">
                    <div className="mb-3 h-4 w-20 rounded bg-white/10" />
                    <div className="space-y-2">
                      {["Tips", "Live Scores", "History", "Profile"].map((item, i) => (
                        <div key={item} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${i === 0 ? "bg-emerald-500/20 text-emerald-300" : "text-white/40"}`}>
                          <div className="h-3.5 w-3.5 rounded bg-current/30" />
                          {item}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-lg bg-emerald-500/10 p-3">
                      <div className="h-3 w-16 rounded bg-emerald-400/30" />
                      <div className="mt-2 h-2 w-12 rounded bg-emerald-400/20" />
                      <div className="mt-3 h-6 w-full rounded bg-emerald-500/30" />
                    </div>
                  </div>
                  {/* Main content */}
                  <div className="col-span-2 space-y-px bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-28 rounded bg-white/10" />
                      <div className="h-3 w-16 rounded bg-white/10" />
                    </div>
                    {/* Mock tip cards */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {[
                        { team: "Arsenal vs Chelsea", odds: "1.75", conf: 85 },
                        { team: "Barcelona vs Atletico", odds: "2.10", conf: 72 },
                        { team: "Inter vs Juventus", odds: "1.40", conf: 90 },
                        { team: "Bayern vs Dortmund", odds: "1.65", conf: 78 },
                      ].map((t) => (
                        <div key={t.team} className="rounded-lg bg-white/[0.04] p-2.5">
                          <div className="h-2.5 w-24 rounded bg-white/15" />
                          <div className="mt-2 flex items-center justify-between">
                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">{t.odds}</span>
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
                              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${t.conf}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-emerald-300/60">
                Preview of the GoalEdge dashboard — available after sign up
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Wave divider after hero */}
      <div className="wave-divider bg-pitch" aria-hidden="true" style={{ transform: `translateY(${heroScrollY * 0.05}px)` }}>
        <svg viewBox="0 0 1440 48" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,32 C360,48 720,0 1080,24 C1260,36 1380,40 1440,32 L1440,48 L0,48 Z" fill="white" />
        </svg>
      </div>
      <div className="dark:hidden" aria-hidden="true">
        <div style={{ height: 0 }} />
      </div>
    </>
  );
}