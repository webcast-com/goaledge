"use client";

import { Tip } from "@/types/goaledge";
import {
  Award,
  X,
  Lock,
  CheckCircle2,
} from "lucide-react";

export function AchievementsPanel({
  betSlipLength,
  bookmarkedCount,
  tipVotesCount,
  isPremium,
  tips,
  stake,
  onClose,
}: {
  betSlipLength: number;
  bookmarkedCount: number;
  tipVotesCount: number;
  isPremium: boolean;
  tips: Tip[];
  stake: string;
  onClose: () => void;
}) {
  const achievements = [
    { id: "first_bet", icon: "🎯", title: "First Bet", desc: "Add your first tip to the bet slip", unlocked: betSlipLength > 0 },
    { id: "streak_3", icon: "🔥", title: "Hot Streak", desc: "3 winning tips in a row", unlocked: true },
    { id: "bookmark_5", icon: "⭐", title: "Collector", desc: "Save 5 tips to favorites", unlocked: bookmarkedCount >= 5 },
    { id: "premium", icon: "👑", title: "Premium Member", desc: "Upgrade to premium access", unlocked: isPremium },
    { id: "explorer", icon: "🔍", title: "Explorer", desc: "View tips from 3 different leagues", unlocked: new Set(tips.slice(0, 6).map(t => t.league)).size >= 3 },
    { id: "sharer", icon: "📤", title: "Social Butterfly", desc: "Share a tip with friends", unlocked: false },
    { id: "high_roller", icon: "💰", title: "High Roller", desc: "Place a stake of Ksh 500+", unlocked: parseFloat(stake) >= 500 },
    { id: "pundit", icon: "🧠", title: "Pundit", desc: "Rate 5 tips as helpful", unlocked: tipVotesCount >= 5 },
    { id: "night_owl", icon: "🦉", title: "Night Owl", desc: "Use the app after midnight", unlocked: new Date().getHours() >= 0 && new Date().getHours() < 5 },
    { id: "loyal", icon: "💎", title: "Loyal Fan", desc: "Visit 7 days in a row", unlocked: false },
    { id: "accumulator", icon: "📊", title: "Accumulator King", desc: "Build a 4+ leg accumulator", unlocked: betSlipLength >= 4 },
    { id: "bankroll_mgr", icon: "🏦", title: "Bankroll Manager", desc: "Set your bankroll target", unlocked: false },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="tip-detail-panel absolute right-0 top-0 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl dark:bg-slate-900 sm:max-w-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Achievements</h3>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-100 px-6 py-3 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Progress</p>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{unlockedCount}/12 Unlocked</p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" style={{ width: `${(unlockedCount / 12) * 100}%` }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {achievements.map((ach) => (
              <div key={ach.id} className={`relative overflow-hidden rounded-2xl border p-4 transition ${ach.unlocked ? "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-800/40 dark:from-amber-950/20 dark:to-orange-950/20" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 opacity-60"}`}>
                {!ach.unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-[1px] dark:bg-slate-900/30">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                )}
                <div className="text-3xl mb-2">{ach.icon}</div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{ach.title}</p>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{ach.desc}</p>
                {ach.unlocked && (
                  <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-emerald-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}