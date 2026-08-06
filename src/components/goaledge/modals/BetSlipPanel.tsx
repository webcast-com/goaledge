"use client";

import { useState } from "react";
import type { Tip, BetType, LiveOddsData } from "@/types/goaledge";
import {
  Ticket,
  X,
  ChevronRight,
  Zap,
  CheckCircle2,
  Trash2,
  Star,
  Share2,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface BetSlipPanelProps {
  open: boolean;
  onClose: () => void;
  betSlip: Tip[];
  accType: BetType;
  eachWay: boolean;
  freeBetMode: boolean;
  oddsBoostApplied: boolean;
  stake: string;
  potentialReturn: string;
  clearConfirming: boolean;
  savedSlips: Array<{ id: string; legs: Tip[]; stake: string; savedAt: string }>;
  onSetAccType: (t: BetType) => void;
  onSetEachWay: (v: boolean) => void;
  onSetFreeBetMode: (v: boolean) => void;
  onSetOddsBoostApplied: (v: boolean) => void;
  onSetStake: (s: string) => void;
  onRemoveFromSlip: (id: string) => void;
  onClearSlip: () => void;
  onSetClearConfirming: (v: boolean) => void;
  onSetSavedSlips: (s: Array<{ id: string; legs: Tip[]; stake: string; savedAt: string }>) => void;
  onPlaceBet: () => void;
  onSetStakeCalcOpen: (id: string | null) => void;
  onSetCalcStake: (s: string) => void;
  stakeCalcOpen: string | null;
  calcStake: string;
  liveOdds: Record<string, LiveOddsData>;
}

export function BetSlipPanel({
  open,
  onClose,
  betSlip,
  accType,
  eachWay,
  freeBetMode,
  oddsBoostApplied,
  stake,
  potentialReturn,
  clearConfirming,
  savedSlips,
  onSetAccType,
  onSetEachWay,
  onSetFreeBetMode,
  onSetOddsBoostApplied,
  onSetStake,
  onRemoveFromSlip,
  onClearSlip,
  onSetClearConfirming,
  onSetSavedSlips,
  onPlaceBet,
  liveOdds,
}: BetSlipPanelProps) {
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleShare = async () => {
    if (betSlip.length === 0) return;
    setSharing(true);
    try {
      const res = await fetch("/api/slips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legs: betSlip.map((t) => ({
            homeTeam: t.homeTeam,
            awayTeam: t.awayTeam,
            league: t.league,
            prediction: t.prediction,
            predictionType: t.predictionType,
            odds: t.odds,
            matchTime: t.matchTime,
          })),
          stake: parseInt(stake) || null,
          totalOdds: parseFloat(potentialReturn) && parseInt(stake) ? parseFloat(potentialReturn) / (parseInt(stake) || 1) : null,
          potentialReturn: parseInt(potentialReturn) || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to share slip");
      const url = new URL(data.url, window.location.origin).toString();
      setShareUrl(url);
      toast.success("Slip shared! Link copied to clipboard");
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard unavailable — link is shown inline anyway
      }
    } catch {
      toast.error("Failed to share slip. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="auth-backdrop absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="bet-slip-panel absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-slate-900 sm:max-w-md">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 dark:text-slate-50">
              Bet Slip
            </h3>
            {betSlip.length > 0 && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                {betSlip.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Accumulator Type Selector */}
        {betSlip.length > 0 && (
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {([
                { key: "single" as const, label: "Single", min: 1 },
                { key: "double" as const, label: "Double", min: 2 },
                { key: "treble" as const, label: "Treble", min: 3 },
                { key: "4fold" as const, label: "4-Fold", min: 4 },
                { key: "5fold" as const, label: "5-Fold", min: 5 },
                { key: "6fold" as const, label: "6-Fold", min: 6 },
                { key: "acca" as const, label: "All", min: 0 },
              ]).map((opt) => {
                const disabled = betSlip.length < opt.min && opt.key !== "acca";
                const active = accType === opt.key;
                return (
                  <button
                    key={opt.key}
                    disabled={disabled}
                    onClick={() => onSetAccType(opt.key)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      disabled
                        ? "cursor-not-allowed bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600"
                        : active
                        ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Each Way + Free Bet Toggles */}
        {betSlip.length > 0 && (
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Each Way</span>
              <button
                onClick={() => onSetEachWay(!eachWay)}
                className={`relative h-5 w-9 rounded-full transition-colors ${eachWay ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${eachWay ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Free Bet</span>
              <button
                onClick={() => onSetFreeBetMode(!freeBetMode)}
                className={`relative h-5 w-9 rounded-full transition-colors ${freeBetMode ? "bg-amber-500" : "bg-slate-200 dark:bg-slate-700"}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${freeBetMode ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
        )}

        {/* Odds Boost Banner */}
        {betSlip.length >= 3 && !oddsBoostApplied && (
          <div className="mx-4 mt-3">
            <button
              onClick={() => { onSetOddsBoostApplied(true); toast.success("Odds boost applied! +10% on all selections"); }}
              className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-white transition-all hover:from-amber-500 hover:to-orange-600 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <div className="text-left">
                  <p className="text-xs font-bold">Odds Boost Available!</p>
                  <p className="text-[10px] text-amber-100">3+ selections? Get +10% boosted odds</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
        {oddsBoostApplied && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800/50 dark:bg-amber-950/20">
            <span className="odds-boost-badge rounded-md px-2 py-0.5 text-[10px] font-bold text-white">BOOSTED</span>
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">+10% odds applied</span>
            <CheckCircle2 className="ml-auto h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {betSlip.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <Ticket className="h-6 w-6 text-slate-400" />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                Your bet slip is empty
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Add tips from the board to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {(() => {
                const effectiveCount = accType === "acca" ? betSlip.length : accType === "single" ? 1 : accType === "double" ? 2 : accType === "treble" ? 3 : accType === "4fold" ? 4 : accType === "5fold" ? 5 : 6;
                const tipsToShow = betSlip.slice(0, effectiveCount === 0 ? betSlip.length : effectiveCount);
                let runningOdds = 1;
                return tipsToShow.map((tip, idx) => {
                  const tipOdds = eachWay ? parseFloat(tip.odds) * (1 + (parseFloat(tip.odds) - 1) / 3) : parseFloat(tip.odds);
                  const boostedOdds = oddsBoostApplied ? tipOdds * 1.1 : tipOdds;
                  runningOdds *= boostedOdds;
                  return (
                    <div
                      key={tip.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">{idx + 1}</span>
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {tip.homeTeam} vs {tip.awayTeam}
                            </p>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {tip.league} · {tip.prediction}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-[10px]">
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">{tip.odds}</span>
                            {eachWay && <span className="text-amber-600 dark:text-amber-400 font-medium">EW: {boostedOdds.toFixed(2)}</span>}
                            {idx < tipsToShow.length - 1 && accType !== "single" && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Running: {runningOdds.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => onRemoveFromSlip(tip.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Combined Odds Display */}
              {accType !== "single" && betSlip.length > 1 && (
                <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Combined Odds</span>
                    <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                      {(() => {
                        const effectiveCount = accType === "acca" ? betSlip.length : accType === "double" ? 2 : accType === "treble" ? 3 : accType === "4fold" ? 4 : accType === "5fold" ? 5 : 6;
                        const tipsToCalc = betSlip.slice(0, effectiveCount === 0 ? betSlip.length : effectiveCount);
                        return tipsToCalc.reduce((acc, t) => {
                          const o = eachWay ? parseFloat(t.odds) * (1 + (parseFloat(t.odds) - 1) / 3) : parseFloat(t.odds);
                          return acc * (oddsBoostApplied ? o * 1.1 : o);
                        }, 1).toFixed(2);
                      })()}
                    </span>
                  </div>
                </div>
              )}
              {/* Payout Breakdown */}
              {betSlip.length > 1 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Payout Breakdown</p>
                  {betSlip.map((t, idx) => {
                    const cumOdds = betSlip.slice(0, idx + 1).reduce((acc, tip) => acc * parseFloat(tip.odds), 1);
                    return (
                      <div key={t.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 truncate max-w-[60%]">{t.homeTeam} vs {t.awayTeam}</span>
                        <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">{cumOdds.toFixed(2)}x</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {betSlip.length > 0 && (
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            {/* Quick Stake Buttons */}
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Stake (Ksh)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={stake}
                  onChange={(e) => onSetStake(e.target.value)}
                  min="1"
                  className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="mt-2 flex gap-1.5">
                {[50, 100, 200, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => onSetStake(String(amt))}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold transition ${
                      stake === String(amt)
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-emerald-600"
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Potential Return */}
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 dark:border-emerald-800/40 dark:from-emerald-950/20 dark:to-teal-950/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {freeBetMode ? "Potential Profit" : "Potential Return"}
                  </p>
                  <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    Ksh {potentialReturn}
                  </p>
                </div>
                {!freeBetMode && (
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Profit</p>
                    <p className={`text-sm font-bold ${(parseInt(potentialReturn) - parseInt(stake) || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                      {parseInt(potentialReturn) - parseInt(stake) || 0 >= 0 ? "+" : ""}Ksh {(parseInt(potentialReturn) - parseInt(stake) || 0).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
              {freeBetMode && (
                <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">Using free bet — stake not deducted</p>
              )}
            </div>

            {shareUrl && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 dark:border-emerald-800/50 dark:bg-emerald-950/20">
                <p className="min-w-0 flex-1 truncate text-xs font-semibold text-emerald-700 dark:text-emerald-400">{shareUrl}</p>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                      toast.success("Link copied!");
                    } catch {
                      toast.error("Could not copy link");
                    }
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700"
                  title="Copy link"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  if (!clearConfirming) { onSetClearConfirming(true); return; }
                  onClearSlip();
                  onSetClearConfirming(false);
                  toast("Bet slip cleared");
                }}
                onBlur={() => setTimeout(() => onSetClearConfirming(false), 200)}
                className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${clearConfirming ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-600 dark:bg-red-950/30 dark:text-red-400" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {clearConfirming ? "Tap again to clear" : "Clear"}
              </button>
              <button
                onClick={() => {
                  const slip = { id: Date.now().toString(), legs: [...betSlip], stake, savedAt: new Date().toISOString() };
                  const updated = [slip, ...savedSlips];
                  onSetSavedSlips(updated);
                  localStorage.setItem("savedSlips", JSON.stringify(updated));
                  toast.success("Bet slip saved!");
                }}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Star className="h-3.5 w-3.5" />
                Save Slip
              </button>
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {sharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
                Share
              </button>
              <button
                onClick={() => {
                  onPlaceBet();
                  onClose();
                }}
                className="flex h-11 flex-[2] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:from-emerald-500 hover:to-emerald-700 active:scale-[0.98]"
              >
                <Ticket className="h-4 w-4" />
                Place Bet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}