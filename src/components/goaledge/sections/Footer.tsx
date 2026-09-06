"use client";

import {
  TrendingUp,
  Twitter,
  Instagram,
  MessageCircle,
  Share2,
  ArrowRight,
  Sparkles,
  Mail,
} from "lucide-react";
import type { ApiStatus } from "@/types/goaledge";

export function Footer({
  apiStatus,
  onSetAuthMode,
  onSetAuthOpen,
}: {
  apiStatus: ApiStatus;
  onSetAuthMode: (m: "signin" | "signup") => void;
  onSetAuthOpen: (v: boolean) => void;
}) {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 pt-12 pb-20 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl">
        {/* Social proof bar */}
        <div className="mb-10 flex flex-col items-center gap-3 border-b border-slate-100 pb-8 text-center sm:flex-row sm:justify-between sm:text-left dark:border-slate-800/80">
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-50">Trusted by thousands of football fans</p>
            <p className="mt-0.5 text-xs text-slate-400">Across 10+ leagues in Africa and Europe</p>
          </div>
          <div className="flex items-center gap-6 text-center">
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-50">2,841+</p>
              <p className="text-[10px] text-slate-400">Active users</p>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-50">53.2%</p>
              <p className="text-[10px] text-slate-400">Win rate</p>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-50">Ksh 2.4M</p>
              <p className="text-[10px] text-slate-400">Total winnings</p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
                <TrendingUp className="h-5 w-5 text-white" />
              </span>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Goal<span className="text-emerald-600 dark:text-emerald-400">Edge</span>
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Expert football predictions powered by data analytics. Making smarter bets accessible to everyone.
            </p>
            <div className="mt-4 flex gap-2.5">
              <button className="footer-social-btn flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-all hover:bg-emerald-100 hover:text-emerald-600 hover:shadow-sm dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400">
                <Twitter className="h-4 w-4" />
              </button>
              <button className="footer-social-btn flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-all hover:bg-emerald-100 hover:text-emerald-600 hover:shadow-sm dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400">
                <Instagram className="h-4 w-4" />
              </button>
              <button className="footer-social-btn flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-all hover:bg-emerald-100 hover:text-emerald-600 hover:shadow-sm dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400">
                <MessageCircle className="h-4 w-4" />
              </button>
              <button className="footer-social-btn flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-all hover:bg-emerald-100 hover:text-emerald-600 hover:shadow-sm dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Product</h4>
            <ul className="mt-3 space-y-2.5">
              {[
                { label: "Free Tips", target: "tips" },
                { label: "Premium Plans", target: "pricing" },
                { label: "Live Scores", target: "live-scores" },
                { label: "Accumulators", target: "tips" },
                { label: "Results", target: "tip-results" },
                { label: "How It Works", target: "how-it-works" },
              ].map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => document.getElementById(link.target)?.scrollIntoView({ behavior: "smooth" })}
                    className="text-sm text-slate-600 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Leagues */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Leagues</h4>
            <ul className="mt-3 space-y-2.5">
              {["Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1", "NPFL"].map((link) => (
                <li key={link}>
                  <button
                    onClick={() => document.getElementById("tips")?.scrollIntoView({ behavior: "smooth" })}
                    className="text-sm text-slate-600 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
                  >
                    {link}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Support</h4>
            <ul className="mt-3 space-y-2.5">
              {[
                { icon: <Mail className="h-3.5 w-3.5" />, text: "support@goaledge.com" },
                { icon: <Sparkles className="h-3.5 w-3.5" />, text: "18+ Gamble responsibly" },
              ].map((item) => (
                <li key={item.text} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span className="text-emerald-500">{item.icon}</span>
                  {item.text}
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <button
                onClick={() => { onSetAuthMode("signup"); onSetAuthOpen(true); }}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 hover:-translate-y-0.5"
              >
                Get started free <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 sm:flex-row dark:border-slate-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/40">
              <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            </span>
            © {new Date().getFullYear()} GoalEdge. All rights reserved.
            {apiStatus === "live" && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Powered by football-data.org
              </span>
            )}
          </div>
          <div className="flex gap-4 text-xs text-slate-400 dark:text-slate-500">
            <button className="transition-colors hover:text-slate-600 dark:hover:text-slate-300">Privacy Policy</button>
            <button className="transition-colors hover:text-slate-600 dark:hover:text-slate-300">Terms of Service</button>
          </div>
        </div>
      </div>
    </footer>
  );
}