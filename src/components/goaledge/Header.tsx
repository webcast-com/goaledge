"use client";

import { type RefObject } from "react";
import {
  TrendingUp,
  RefreshCw,
  Search,
  Bell,
  Trophy,
  Zap,
  Target,
  Crown,
  ChevronDown,
  User,
  History,
  Award,
  Radio,
  LogOut,
  Ticket,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/goaledge/theme-toggle";
import type { ApiStatus, Tip, Notification } from "@/types/goaledge";
import type { Session } from "@/types/auth";

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */
export interface HeaderProps {
  scrolled: boolean;
  activeSection: string;
  apiStatus: ApiStatus;
  dataSource: string;
  tipsCount: number;
  session: Session | null;
  profileOpen: boolean;
  notificationsOpen: boolean;
  betSlipLength: number;
  mobileMenuOpen: boolean;
  searchOpen: boolean;
  searchQuery: string;
  searchedTips: Tip[];
  notifications: Notification[];
  notifPrefs: {
    newTips: boolean;
    results: boolean;
    odds: boolean;
    promotions: boolean;
  };
  /* refs */
  searchRef: RefObject<HTMLInputElement | null>;
  notifRef: RefObject<HTMLDivElement | null>;
  profileRef: RefObject<HTMLDivElement | null>;
  /* callbacks */
  onSetSearchOpen: (v: boolean) => void;
  onSetSearchQuery: (q: string) => void;
  onSetSelectedTip: (tip: Tip) => void;
  onSetNotificationsOpen: (v: boolean) => void;
  onSetProfileOpen: (v: boolean) => void;
  onSetMobileMenuOpen: (v: boolean) => void;
  onSetUserProfileOpen: (v: boolean) => void;
  onSetAchievementsOpen: (v: boolean) => void;
  onSetAdminOpen: (v: boolean) => void;
  onSetAuthMode: (m: "signin" | "signup") => void;
  onSetAuthOpen: (v: boolean) => void;
  onSetAuthError: (e: string) => void;
  onSetBetSlipOpen: (v: boolean) => void;
  onSignOut: () => void;
  onOpenMyBets: () => void;
  onFetchAdminTips: () => void;
  onNotifPrefsChange: (p: {
    newTips: boolean;
    results: boolean;
    odds: boolean;
    promotions: boolean;
  }) => void;
  onOpenApiKeySettings: () => void;
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export function Header({
  scrolled,
  activeSection,
  apiStatus,
  dataSource,
  tipsCount,
  session,
  profileOpen,
  notificationsOpen,
  betSlipLength,
  mobileMenuOpen,
  searchOpen,
  searchQuery,
  searchedTips,
  notifications,
  notifPrefs,
  searchRef,
  notifRef,
  profileRef,
  onSetSearchOpen,
  onSetSearchQuery,
  onSetSelectedTip,
  onSetNotificationsOpen,
  onSetProfileOpen,
  onSetMobileMenuOpen,
  onSetUserProfileOpen,
  onSetAchievementsOpen,
  onSetAdminOpen,
  onSetAuthMode,
  onSetAuthOpen,
  onSetAuthError,
  onSetBetSlipOpen,
  onSignOut,
  onOpenMyBets,
  onFetchAdminTips,
  onNotifPrefsChange,
  onOpenApiKeySettings,
}: HeaderProps) {
  return (
    <>
      {/* ==================== HEADER ==================== */}
      <header
        data-scrolled={scrolled ? "true" : "false"}
        className={`sticky top-0 z-40 border-b transition-all duration-300 ${
          scrolled
            ? "border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90"
            : "border-white/10 bg-transparent backdrop-blur-md"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 transition-transform hover:scale-105">
              <TrendingUp className="h-5 w-5 text-white" />
            </span>
            <span
              className={`text-lg font-bold tracking-tight transition-colors ${
                scrolled
                  ? "text-slate-900 dark:text-white"
                  : "text-white"
              }`}
            >
              Goal<span className="text-emerald-400">Edge</span>
            </span>
            {/* API Status Indicator — clickable to open settings */}
            <button
              onClick={onOpenApiKeySettings}
              className={`ml-2 hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold sm:inline-flex transition-all hover:scale-105 hover:shadow-md ${
                apiStatus === "live"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60"
                  : apiStatus === "seed"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60"
                    : apiStatus === "offline"
                      ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 animate-pulse"
              }`}
              title={
                apiStatus === "live"
                  ? `Live data from football-data.org · ${dataSource} · ${tipsCount} matches — Click to manage API key`
                  : apiStatus === "seed"
                    ? "Using sample data — Click to add your API key"
                    : apiStatus === "offline"
                      ? "No API key configured — Click to add your key"
                      : "Checking API connection..."
              }
            >
              {apiStatus === "live" && (
                <>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  LIVE
                </>
              )}
              {apiStatus === "seed" && (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  DEMO
                </>
              )}
              {apiStatus === "offline" && (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  OFFLINE
                </>
              )}
              {apiStatus === "checking" && (
                <>
                  <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                  LOADING
                </>
              )}
            </button>
          </div>
          <nav className="hidden items-center gap-1 sm:flex">
            {["Tips", "Features", "Pricing", "FAQ"].map((item) => {
              const isActive = item.toLowerCase() === activeSection;
              return (
                <button
                  key={item}
                  onClick={() =>
                    document
                      .getElementById(item.toLowerCase())
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "font-semibold text-emerald-600 underline underline-offset-4 decoration-emerald-600/60 dark:text-emerald-400 dark:decoration-emerald-400/60"
                      : scrolled
                        ? "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                        : "font-medium text-white/70 hover:bg-white/10 hover:text-white"
                  }`
                }
                >
                  {item}
                </button>
              );
            })}

            {/* Search button */}
            <button
              onClick={() => {
                onSetSearchOpen(true);
                setTimeout(() => searchRef.current?.focus(), 100);
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                scrolled
                  ? "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
              title="Search tips (⌘K)"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => onSetNotificationsOpen(!notificationsOpen)}
                className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  scrolled
                    ? "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Bell className="h-4 w-4" />
                {3 > 0 && (
                  <span
                    className="animate-notif-badge absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900"
                    aria-hidden="true"
                  >
                    3
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Notifications
                    </h4>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                      {notifications.length} new
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          onSetNotificationsOpen(false);
                          toast.info(n.message);
                        }}
                        className="flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/50"
                      >
                        <span
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            n.type === "win"
                              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : n.type === "alert"
                                ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                          }`}
                        >
                          {n.type === "win" ? (
                            <Trophy className="h-4 w-4" />
                          ) : n.type === "alert" ? (
                            <Zap className="h-4 w-4" />
                          ) : (
                            <Target className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">
                            {n.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                            {n.message}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                            {n.time}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Preferences
                    </p>
                    <div className="space-y-2">
                      {(
                        [
                          { key: "newTips" as const, label: "New tips" },
                          { key: "results" as const, label: "Results" },
                          { key: "odds" as const, label: "Odds changes" },
                          { key: "promotions" as const, label: "Promotions" },
                        ] as const
                      ).map(({ key, label }) => (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {label}
                          </span>
                          <button
                            onClick={() =>
                              onNotifPrefsChange({
                                ...notifPrefs,
                                [key]: !notifPrefs[key],
                              })
                            }
                            className={`relative h-5 w-9 rounded-full transition-colors ${
                              notifPrefs[key]
                                ? "bg-emerald-500"
                                : "bg-slate-200 dark:bg-slate-700"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                notifPrefs[key]
                                  ? "translate-x-4"
                                  : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <ThemeToggle />
            {session ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => onSetProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                    {(
                      session.user?.name ||
                      session.user?.email ||
                      "U"
                    )[0].toUpperCase()}
                  </span>
                  <span className="hidden max-w-[100px] truncate text-slate-700 dark:text-slate-200 sm:inline">
                    {session.user?.name ||
                      session.user?.email?.split("@")[0]}
                  </span>
                  {session.user?.plan === "premium" && (
                    <span className="hidden items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 sm:inline-flex">
                      <Crown className="h-2.5 w-2.5" /> PRO
                    </span>
                  )}
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                      profileOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {session.user?.name}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {session.user?.email}
                      </p>
                    </div>
                    <div className="p-1.5">
                      <button
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        onClick={() => {
                          onSetProfileOpen(false);
                          onSetUserProfileOpen(true);
                        }}
                      >
                        <User className="h-4 w-4 text-slate-400" /> Profile
                      </button>
                      <button
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        onClick={() => {
                          onSetProfileOpen(false);
                          onOpenMyBets();
                        }}
                      >
                        <History className="h-4 w-4 text-slate-400" /> My
                        Bets
                      </button>
                      <button
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        onClick={() => {
                          onSetProfileOpen(false);
                          onSetAchievementsOpen(true);
                        }}
                      >
                        <Award className="h-4 w-4 text-slate-400" />{" "}
                        Achievements
                      </button>
                      <button
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        onClick={() => {
                          onSetProfileOpen(false);
                          onSetAdminOpen(true);
                          onFetchAdminTips();
                        }}
                      >
                        <Radio className="h-4 w-4 text-slate-400" /> Admin
                        Dashboard
                      </button>
                      <button
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                        onClick={() => {
                          onSetProfileOpen(false);
                          onSignOut();
                          toast.info("Signed out");
                        }}
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    onSetAuthMode("signin");
                    onSetAuthError("");
                    onSetAuthOpen(true);
                  }}
                  className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-all active:translate-y-0 ${
                    scrolled
                      ? "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Sign in
                </button>
                <button
                  onClick={() => onSetBetSlipOpen(true)}
                  className="relative rounded-xl p-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                  aria-label="Open bet slip"
                >
                  <Ticket className="h-4 w-4" />
                  {betSlipLength > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                      {betSlipLength}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    onSetAuthMode("signup");
                    onSetAuthError("");
                    onSetAuthOpen(true);
                  }}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-emerald-700 shadow-sm shadow-emerald-500/10 transition-all hover:-translate-y-px hover:bg-emerald-50 hover:shadow-emerald-500/20 active:translate-y-0"
                >
                  Get started
                </button>
              </>
            )}
          </nav>

          {/* Mobile: hamburger + bet slip + bell */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={() => onSetNotificationsOpen(!notificationsOpen)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {3 > 0 && (
                <span className="animate-notif-badge absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                  3
                </span>
              )}
            </button>
            <button
              onClick={() => onSetBetSlipOpen(true)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
              aria-label="Open bet slip"
            >
              <Ticket className="h-4 w-4" />
              {betSlipLength > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                  {betSlipLength}
                </span>
              )}
            </button>
            <button
              onClick={() => onSetMobileMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ==================== SEARCH MODAL ==================== */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => onSetSearchOpen(false)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => onSetSearchQuery(e.target.value)}
                placeholder="Search tips, teams, leagues..."
                className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none dark:text-white dark:placeholder:text-slate-500"
              />
              <kbd className="kbd-hint hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-400 sm:inline dark:border-slate-700 dark:bg-slate-800">
                ESC
              </kbd>
            </div>
            {searchQuery.trim() && searchedTips && (
              <div className="max-h-72 overflow-y-auto p-2">
                {searchedTips.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    No tips match your search
                  </p>
                ) : (
                  searchedTips.map((tip) => (
                    <button
                      key={tip.id}
                      onClick={() => {
                        onSetSelectedTip(tip);
                        onSetSearchOpen(false);
                        onSetSearchQuery("");
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <span className="text-lg">{tip.flag}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {tip.homeTeam} vs {tip.awayTeam}
                        </p>
                        <p className="text-xs text-slate-400">
                          {tip.league} · {tip.prediction}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {tip.odds}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
            {!searchQuery.trim() && (
              <div className="p-4 text-center text-sm text-slate-400">
                <p>Start typing to search tips...</p>
                <p className="mt-1 text-xs">
                  Try &ldquo;Liverpool&rdquo;, &ldquo;Premier
                  League&rdquo;, or &ldquo;Over 2.5&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MOBILE MENU ==================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => onSetMobileMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-72 bg-slate-900 p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-white">
                Goal<span className="text-emerald-400">Edge</span>
              </span>
              <button
                onClick={() => onSetMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-8 space-y-1">
              {["Tips", "Features", "Pricing", "FAQ"].map((item) => {
                const isActive = item.toLowerCase() === activeSection;
                return (
                  <button
                    key={item}
                    onClick={() => {
                      onSetMobileMenuOpen(false);
                      document
                        .getElementById(item.toLowerCase())
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      isActive
                        ? "font-semibold text-emerald-400 bg-white/10"
                        : "font-medium text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </nav>
            <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
              {session ? (
                <>
                  <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                      {(
                        session.user?.name ||
                        session.user?.email ||
                        "U"
                      )[0].toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {session.user?.name || "User"}
                      </p>
                      <p className="truncate text-xs text-white/50">
                        {session.user?.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onSignOut();
                      onSetMobileMenuOpen(false);
                      toast.info("Signed out");
                    }}
                    className="w-full rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      onSetAuthMode("signin");
                      onSetAuthError("");
                      onSetAuthOpen(true);
                      onSetMobileMenuOpen(false);
                    }}
                    className="w-full rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => {
                      onSetAuthMode("signup");
                      onSetAuthError("");
                      onSetAuthOpen(true);
                      onSetMobileMenuOpen(false);
                    }}
                    className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Get started
                  </button>
                </>
              )}
            </div>
            <div className="mt-8 flex items-center gap-2 text-xs text-white/40">
              <ThemeToggle />
              <span>Toggle theme</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}