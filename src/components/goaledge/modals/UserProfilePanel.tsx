"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSession, signOut } from "next-auth/react";
import {
  X,
  User,
  BarChart3,
  Wallet,
  Bell,
  Crown,
  Eye,
  TrendingUp,
  Star,
  CalendarDays,
  ChevronRight,
  Trash2,
  LogOut,
} from "lucide-react";

export function UserProfilePanel({
  session,
  bookmarkedTips,
  tipVotes,
  betSlipLength,
  onClose,
  onUpgrade,
  notifPrefs,
  onNotifPrefsChange,
  bankroll,
  onBankrollChange,
}: {
  session: ReturnType<typeof useSession>;
  bookmarkedTips: Set<string>;
  tipVotes: Record<string, "up" | "down">;
  betSlipLength: number;
  onClose: () => void;
  onUpgrade: () => void;
  notifPrefs: { newTips: boolean; results: boolean; odds: boolean; promotions: boolean };
  onNotifPrefsChange: (p: { newTips: boolean; results: boolean; odds: boolean; promotions: boolean }) => void;
  bankroll: string;
  onBankrollChange: (v: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "bets" | "payments" | "settings">("overview");
  const [betFilter, setBetFilter] = useState<"all" | "won" | "lost">("all");
  const [payments, setPayments] = useState<Array<Record<string, string>>>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const userName = session?.user?.name || "Guest User";
  const userEmail = session?.user?.email || "demo@goaledge.com";
  const isPremium = (session?.user as Record<string, unknown> | null)?.plan === "premium";
  const userInitial = userName.charAt(0).toUpperCase();

  const betHistory = [
    { id: "b1", match: "Arsenal vs Chelsea", prediction: "Over 2.5", odds: "1.75", stake: "200", result: "won" as const, pnl: "+150" },
    { id: "b2", match: "Real Madrid vs Sevilla", prediction: "Home Win", odds: "1.45", stake: "500", result: "won" as const, pnl: "+225" },
    { id: "b3", match: "Bayern vs Dortmund", prediction: "BTTS Yes", odds: "1.80", stake: "300", result: "lost" as const, pnl: "-300" },
    { id: "b4", match: "PSG vs Lyon", prediction: "Home Win", odds: "1.55", stake: "400", result: "won" as const, pnl: "+220" },
    { id: "b5", match: "Inter vs Juventus", prediction: "Under 2.5", odds: "2.10", stake: "200", result: "lost" as const, pnl: "-200" },
    { id: "b6", match: "Liverpool vs Brighton", prediction: "Home -1", odds: "1.90", stake: "250", result: "won" as const, pnl: "+225" },
  ];

  const filteredBets = betFilter === "all" ? betHistory : betHistory.filter(b => b.result === betFilter);
  const totalStaked = betHistory.reduce((a, b) => a + parseInt(b.stake), 0);
  const totalReturns = betHistory.filter(b => b.result === "won").reduce((a, b) => a + parseInt(b.stake) * parseFloat(b.odds), 0);
  const netPL = totalReturns - totalStaked;
  const roi = totalStaked > 0 ? ((netPL / totalStaked) * 100).toFixed(1) : "0.0";

  useEffect(() => {
    if (activeTab === "payments") {
      let cancelled = false;
      (async () => {
        try {
          const r = await fetch(`/api/payment/history?email=${userEmail}`);
          const data = await r.json();
          if (!cancelled) setPayments(data.payments || data.history || []);
        } catch {
          if (!cancelled) setPayments([]);
        } finally {
          if (!cancelled) setPaymentsLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }
  }, [activeTab, userEmail]);

  const totalSpent = payments.reduce((a: number, p: Record<string, string>) => a + (parseFloat(p.amount) || 0), 0);

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: <User className="h-4 w-4" /> },
    { key: "bets" as const, label: "Bet History", icon: <BarChart3 className="h-4 w-4" /> },
    { key: "payments" as const, label: "Payments", icon: <Wallet className="h-4 w-4" /> },
    { key: "settings" as const, label: "Settings", icon: <Bell className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="tip-detail-panel absolute right-0 top-0 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl dark:bg-slate-900 sm:max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">My Profile</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 dark:border-slate-800">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold transition border-b-2 ${activeTab === tab.key ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-bold text-white shadow-lg shadow-emerald-500/20">
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{userName}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>
                  <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${isPremium ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                    <Crown className="h-3 w-3" /> {isPremium ? "Premium" : "Free"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Tips Viewed", value: "47", icon: <Eye className="h-4 w-4 text-blue-500" />, color: "bg-blue-50 dark:bg-blue-950/20" },
                  { label: "Win Rate", value: "68%", icon: <TrendingUp className="h-4 w-4 text-emerald-500" />, color: "bg-emerald-50 dark:bg-emerald-950/20" },
                  { label: "Tips Bookmarked", value: String(bookmarkedTips.size), icon: <Star className="h-4 w-4 text-amber-500" />, color: "bg-amber-50 dark:bg-amber-950/20" },
                  { label: "Days Active", value: "12", icon: <CalendarDays className="h-4 w-4 text-purple-500" />, color: "bg-purple-50 dark:bg-purple-950/20" },
                ].map((stat) => (
                  <div key={stat.label} className={`rounded-xl ${stat.color} p-3.5`}>
                    <div className="mb-1.5">{stat.icon}</div>
                    <p className="text-xl font-extrabold text-slate-900 dark:text-white">{stat.value}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Actions</p>
                <div className="space-y-2">
                  {!isPremium && (
                    <button onClick={onUpgrade} className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:from-amber-500 hover:to-orange-600">
                      <Crown className="h-4 w-4" /> Upgrade to Premium
                    </button>
                  )}
                  <button className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Star className="h-4 w-4 text-amber-500" /> View Saved Tips
                    <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
                  </button>
                  <button onClick={() => setActiveTab("bets")} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <BarChart3 className="h-4 w-4 text-blue-500" /> View Bet History
                    <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bet History Tab */}
          {activeTab === "bets" && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Total Staked", value: `Ksh ${totalStaked.toLocaleString()}` },
                  { label: "Total Returns", value: `Ksh ${Math.round(totalReturns).toLocaleString()}` },
                  { label: "Net P&L", value: `Ksh ${netPL >= 0 ? "+" : ""}${netPL.toLocaleString()}`, positive: netPL >= 0 },
                  { label: "ROI", value: `${roi}%`, positive: parseFloat(roi) >= 0 },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-slate-50 p-2.5 text-center dark:bg-slate-800">
                    <p className="text-[10px] text-slate-400">{s.label}</p>
                    <p className={`text-sm font-bold ${s.positive !== undefined ? (s.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400") : "text-slate-900 dark:text-white"}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-1.5">
                {(["all", "won", "lost"] as const).map((f) => (
                  <button key={f} onClick={() => setBetFilter(f)} className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${betFilter === f ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"}`}>
                    {f === "all" ? "All" : f === "won" ? "Won" : "Lost"}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {filteredBets.map((bet) => (
                  <div key={bet.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{bet.match}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${bet.result === "won" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>
                        {bet.result === "won" ? "Won" : "Lost"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{bet.prediction} @ {bet.odds} · Stake: Ksh {bet.stake}</p>
                    <p className={`mt-1 text-xs font-bold ${bet.pnl.startsWith("+") ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                      P&L: {bet.pnl.startsWith("+") ? "+" : ""}Ksh {Math.abs(parseInt(bet.pnl)).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-xs text-slate-400">Total Spent</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">Ksh {Math.round(totalSpent).toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-xs text-slate-400">Active Subscriptions</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{isPremium ? "1" : "0"}</p>
                </div>
              </div>

              {paymentsLoading ? (
                <div className="py-8 text-center text-sm text-slate-400">Loading payments...</div>
              ) : payments.length === 0 ? (
                <div className="py-8 text-center">
                  <Wallet className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
                  <p className="mt-2 text-sm text-slate-400">No payment history yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.map((p: Record<string, string>, i: number) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.plan || "Plan"}</p>
                          <p className="text-xs text-slate-400">{p.date || p.createdAt || "—"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Ksh {p.amount || "0"}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.status === "completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : p.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>
                            {p.status || "unknown"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Notification Preferences</p>
                <div className="space-y-3">
                  {([
                    { key: "newTips" as const, label: "New Tips", desc: "Get notified when new tips are posted" },
                    { key: "results" as const, label: "Results", desc: "Tip result notifications" },
                    { key: "odds" as const, label: "Odds Changes", desc: "Significant odds movement alerts" },
                    { key: "promotions" as const, label: "Promotions", desc: "Deals, discounts, and offers" },
                  ]).map((pref) => (
                    <div key={pref.key} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{pref.label}</p>
                        <p className="text-xs text-slate-400">{pref.desc}</p>
                      </div>
                      <button
                        onClick={() => onNotifPrefsChange({ ...notifPrefs, [pref.key]: !notifPrefs[pref.key] })}
                        className={`relative h-5 w-9 rounded-full transition-colors ${notifPrefs[pref.key] ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${notifPrefs[pref.key] ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bankroll Target (Ksh)</p>
                <input
                  type="number"
                  value={bankroll}
                  onChange={(e) => onBankrollChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <button
                onClick={() => toast.success("Data cleared!")}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-800/50 dark:bg-red-950/20 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" /> Clear all data
              </button>

              <button
                onClick={() => { signOut(); onClose(); }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}