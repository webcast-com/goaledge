"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Trophy,
  Target,
  Earth,
  Play,
} from "lucide-react";

/* Rotating headline words — the first word is part of the server-rendered
   HTML so the hero LCP paints instantly; rotation only starts after mount.
   (Rendered inline, not in a sub-component, so the static contrast auditor
   keeps the .bg-pitch context for the gradient text.) */
const ROTATING_WORDS = ["matches", "accumulators", "bet slips", "weekends"];

/* ------------------------------------------------------------------ */
/*  Hero                                                                */
/*                                                                      */
/*  Performance: every element is visible in the initial HTML — no     */
/*  FadeIn/hydration gate — and the entrance is a pure CSS animation   */
/*  (.hero-rise) that starts at first paint instead of waiting for     */
/*  the JS bundle. The old per-scroll parallax (which re-rendered the  */
/*  whole page on every scroll event) is gone, and the decoration is   */
/*  the two cheap .hero-orb layers only — the six extra blur-3xl       */
/*  blobs, grid overlay and feTurbulence noise layer were dropped.     */
/* ------------------------------------------------------------------ */
export function Hero({
  onSetAuthMode,
  onSetAuthOpen,
}: {
  onSetAuthMode: (m: "signin" | "signup") => void;
  onSetAuthOpen: (v: boolean) => void;
}) {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setWordIndex((i) => (i + 1) % ROTATING_WORDS.length),
      2600,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {/* ==================== HERO ==================== */}
      <section className="bg-pitch relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 sm:pt-28">
        <div className="hero-orb hero-orb-1" aria-hidden="true" />
        <div className="hero-orb hero-orb-2" aria-hidden="true" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="hero-rise">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-bold text-white ring-1 ring-emerald-400/40 shadow-lg shadow-emerald-500/10">
              <span className="relative flex h-2.5 w-2.5">
                <span className="live-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-300" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
              </span>
              LIVE · 73% win rate this week
            </span>
          </div>

          <div className="hero-rise" style={{ animationDelay: "0.08s" }}>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Predict smarter.
              <br />
              Win more{" "}
              <span className="word-rotator">
                <span
                  key={ROTATING_WORDS[wordIndex]}
                  className="word-rotator-word gradient-animate bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-400 bg-clip-text text-transparent"
                >
                  {ROTATING_WORDS[wordIndex]}
                </span>
              </span>
            </h1>
          </div>

          <div className="hero-rise" style={{ animationDelay: "0.16s" }}>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-100 sm:text-lg">
              Expert tips with confidence scores, live odds from 8+ bookmakers
              and every result published — no guesswork, just the edge.
            </p>
          </div>

          <div className="hero-rise" style={{ animationDelay: "0.24s" }}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button onClick={() => { onSetAuthMode("signup"); onSetAuthOpen(true); }} className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 text-base font-bold text-emerald-700 shadow-lg shadow-black/10 transition-all hover:bg-emerald-50 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
                Start free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button onClick={() => document.getElementById("tips")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-6 text-sm font-semibold text-white transition-all hover:border-white/50 hover:bg-white/20 hover:-translate-y-0.5 active:translate-y-0">
                <Play className="h-4 w-4" /> Live demo
              </button>
            </div>
          </div>

          {/* Stats — static values so they paint with the page (no JS counter) */}
          <div className="hero-rise" style={{ animationDelay: "0.32s" }}>
            <div className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-3 sm:gap-4">
              {[
                { icon: <Trophy className="h-5 w-5 text-emerald-300" />, value: "73%", label: "Win rate" },
                { icon: <Target className="h-5 w-5 text-emerald-300" />, value: "12K+", label: "Tips delivered" },
                { icon: <Earth className="h-5 w-5 text-emerald-300" />, value: "10+", label: "Leagues" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-5 text-white transition-all hover:border-emerald-400/30 hover:bg-white/[0.08] hover:shadow-lg hover:shadow-emerald-500/10">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
                    {stat.icon}
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums">{stat.value}</p>
                  <p className="text-xs text-white/85">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard Preview Mockup */}
          <div className="hero-rise" style={{ animationDelay: "0.45s" }}>
            <div className="mx-auto mt-16 max-w-3xl">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] shadow-2xl shadow-black/20">
                {/* Mock window chrome */}
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-red-400/80" />
                    <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="rounded-md bg-white/[0.06] px-3 py-1 text-[11px] text-white/90">goaledge.com/dashboard</span>
                  </div>
                </div>
                {/* Mock dashboard content */}
                <div className="grid grid-cols-3 gap-px bg-white/5 p-px">
                  {/* Sidebar */}
                  <div className="col-span-1 space-y-px bg-slate-950/40 p-4">
                    <div className="mb-3 h-4 w-20 rounded bg-white/10" />
                    <div className="space-y-2">
                      {["Tips", "Live Scores", "History", "Profile"].map((item, i) => (
                        <div key={item} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${i === 0 ? "bg-emerald-500/20 text-emerald-300" : "text-white/90"}`}>
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
                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200">{t.odds}</span>
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
              <p className="mt-3 text-center text-xs text-emerald-100">
                Preview of the GoalEdge dashboard — available after sign up
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Wave divider after hero */}
      <div className="wave-divider bg-pitch" aria-hidden="true">
        <svg viewBox="0 0 1440 48" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,32 C360,48 720,0 1080,24 C1260,36 1380,40 1440,32 L1440,48 L0,48 Z" fill="white" />
        </svg>
      </div>
    </>
  );
}
