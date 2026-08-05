"use client";

import type { Tip, BetType, BetHistoryItem, BetSummary } from "@/types/goaledge";
import {
  Ticket,
  X,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  Receipt,
  History,
  RefreshCw,
} from "lucide-react";

interface PlaceBetModalProps {
  open: boolean;
  step: "confirm" | "processing" | "success" | "error";
  betSlip: Tip[];
  accType: BetType;
  stake: string;
  potentialReturn: string;
  placedBetId: string;
  placeBetError: string;
  myBetsOpen: boolean;
  myBets: BetHistoryItem[];
  myBetsSummary: BetSummary | null;
  myBetsFilter: string;
  myBetsLoading: boolean;
  onClose: () => void;
  onPlaceBet: () => void;
  onOpenMyBets: () => void;
  onFetchMyBets: () => void;
  onSetMyBetsFilter: (f: string) => void;
  onSetMyBetsOpen: (v: boolean) => void;
  onSetBetSlipOpen: (v: boolean) => void;
}

export function PlaceBetModal({
  open,
  step,
  betSlip,
  accType,
  stake,
  potentialReturn,
  placedBetId,
  placeBetError,
  myBetsOpen,
  myBets,
  myBetsSummary,
  myBetsFilter,
  myBetsLoading,
  onClose,
  onPlaceBet,
  onOpenMyBets,
  onFetchMyBets,
  onSetMyBetsFilter,
  onSetMyBetsOpen,
  onSetBetSlipOpen,
}: PlaceBetModalProps) {
  return (
    <>
      {/* ==================== PLACE BET MODAL ==================== */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (step !== "processing") onClose(); }} />
          <div className="payment-modal-slide relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">

            {/* CONFIRM STEP */}
            {step === "confirm" && (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Bet</h3>
                  </div>
                  <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Bet Type</span>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 capitalize">{accType}</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {(() => {
                        const effectiveCount = accType === "acca" ? betSlip.length : accType === "single" ? 1 : accType === "double" ? 2 : accType === "treble" ? 3 : accType === "4fold" ? 4 : accType === "5fold" ? 5 : 6;
                        return betSlip.slice(0, effectiveCount === 0 ? betSlip.length : effectiveCount).map((t, i) => (
                          <div key={t.id} className="flex items-center gap-3 rounded-lg bg-white p-2.5 dark:bg-slate-800">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{i + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{t.homeTeam} vs {t.awayTeam}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">{t.prediction} · {t.league}</p>
                            </div>
                            <span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{t.odds}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Stake</p>
                      <p className="text-lg font-extrabold text-slate-900 dark:text-white">Ksh {parseInt(stake || "0").toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Total Odds</p>
                      <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                        {(() => {
                          const effectiveCount = accType === "acca" ? betSlip.length : accType === "single" ? 1 : accType === "double" ? 2 : accType === "treble" ? 3 : accType === "4fold" ? 4 : accType === "5fold" ? 5 : 6;
                          return betSlip.slice(0, effectiveCount === 0 ? betSlip.length : effectiveCount).reduce((a, t) => a * parseFloat(t.odds), 1).toFixed(2);
                        })()}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-3 text-center dark:border-emerald-800/40 dark:from-emerald-950/20 dark:to-teal-950/20">
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Potential Return</p>
                      <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">Ksh {Number(potentialReturn).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/20">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5 dark:text-amber-400" />
                    <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">This is a record-keeping bet tracker. No real money is wagered. Track your predictions and measure your betting performance.</p>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
                  <button onClick={() => { onClose(); onSetBetSlipOpen(true); }} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                    Back
                  </button>
                  <button onClick={onPlaceBet} className="flex h-11 flex-[2] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-400 hover:to-emerald-600 active:scale-[0.98]">
                    <ClipboardCheck className="h-4 w-4" />
                    Confirm Bet — Ksh {parseInt(stake || "0").toLocaleString()}
                  </button>
                </div>
              </>
            )}

            {/* PROCESSING STEP */}
            {step === "processing" && (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="relative mb-6">
                  <div className="h-16 w-16 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
                  <Ticket className="absolute inset-0 m-auto h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Placing your bet...</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Processing your {accType} with {betSlip.length} {betSlip.length === 1 ? "leg" : "legs"}</p>
              </div>
            )}

            {/* SUCCESS STEP */}
            {step === "success" && (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bet Placed!</h3>
                  </div>
                  <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <ClipboardCheck className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 dark:border-emerald-800/40 dark:from-emerald-950/20 dark:to-teal-950/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Bet Receipt</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Bet ID</span>
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">{placedBetId.slice(0, 12)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Type</span>
                        <span className="font-semibold text-slate-900 dark:text-white capitalize">{accType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Legs</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{betSlip.length} selections</span>
                      </div>
                      <div className="border-t border-emerald-200/50 my-1 dark:border-emerald-800/30" />
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Stake</span>
                        <span className="font-bold text-slate-900 dark:text-white">Ksh {parseInt(stake || "0").toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Potential Return</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">Ksh {Number(potentialReturn).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">Your bet is being tracked. We'll notify you of results.</p>
                </div>
                <div className="flex gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
                  <button onClick={() => { onClose(); onOpenMyBets(); }} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                    <History className="h-4 w-4" /> View My Bets
                  </button>
                  <button onClick={onClose} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-500">
                    Done
                  </button>
                </div>
              </>
            )}

            {/* ERROR STEP */}
            {step === "error" && (
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bet Failed</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{placeBetError || "Something went wrong. Please try again."}</p>
                <div className="mt-6 flex gap-2">
                  <button onClick={() => { onClose(); onSetBetSlipOpen(true); }} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                    Back to Slip
                  </button>
                  <button onClick={onPlaceBet} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-500">
                    <RefreshCw className="h-4 w-4" /> Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MY BETS PANEL ==================== */}
      {myBetsOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onSetMyBetsOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900 sm:max-w-lg">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 dark:text-white">My Bets</h3>
                {myBetsSummary && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                    {myBetsSummary.totalBets}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onFetchMyBets} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                  <RefreshCw className={`h-4 w-4 ${myBetsLoading ? "animate-spin" : ""}`} />
                </button>
                <button onClick={() => onSetMyBetsOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {myBetsSummary && myBetsSummary.totalBets > 0 && (
              <div className="grid grid-cols-4 gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
                <div className="rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-800/50">
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Win Rate</p>
                  <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{myBetsSummary.winRate}%</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-800/50">
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Staked</p>
                  <p className="text-base font-extrabold text-slate-900 dark:text-white">Ksh {myBetsSummary.totalStaked.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-800/50">
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Returns</p>
                  <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">Ksh {myBetsSummary.totalReturned.toLocaleString()}</p>
                </div>
                <div className={`rounded-xl p-2.5 text-center ${myBetsSummary.profit >= 0 ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">P/L</p>
                  <p className={`text-base font-extrabold ${myBetsSummary.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {myBetsSummary.profit >= 0 ? "+" : ""}Ksh {myBetsSummary.profit.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {myBetsSummary && myBetsSummary.totalBets > 0 && (
              <div className="flex gap-1 border-b border-slate-100 px-4 py-2 dark:border-slate-800">
                {(["all", "pending", "won", "lost", "void"] as const).map((f) => (
                  <button key={f} onClick={() => onSetMyBetsFilter(f)} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                    myBetsFilter === f
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}>
                    {f}{f === "pending" && myBetsSummary && ` (${myBetsSummary.pendingBets})`}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              {myBetsLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <RefreshCw className="h-8 w-8 animate-spin text-emerald-500 mb-3" />
                  <p className="text-sm text-slate-500">Loading your bets...</p>
                </div>
              ) : myBets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <Ticket className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">No bets yet</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Place your first bet from the bet slip to start tracking!</p>
                  <button onClick={() => { onSetMyBetsOpen(false); onSetBetSlipOpen(true); }} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500">
                    Browse Tips
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myBets.filter((b) => myBetsFilter === "all" || b.status === myBetsFilter).map((bet) => (
                    <div key={bet.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-700/50">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            bet.status === "won" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" :
                            bet.status === "lost" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                            bet.status === "void" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                            "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                          }`}>{bet.status.toUpperCase()}</span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-white capitalize">{bet.betType}</span>
                          <span className="text-[10px] text-slate-400">{bet.legs.length} {bet.legs.length === 1 ? "leg" : "legs"}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{new Date(bet.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="px-4 py-2 space-y-1.5 max-h-36 overflow-y-auto">
                        {bet.legs.map((leg, i) => (
                          <div key={leg.tipId} className="flex items-center gap-2">
                            {bet.result && (
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                                bet.result[i]?.result === "won" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" :
                                bet.result[i]?.result === "lost" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                                bet.result[i]?.result === "void" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                              }`}>
                                {bet.result[i]?.result === "won" ? "W" : bet.result[i]?.result === "lost" ? "L" : bet.result[i]?.result === "void" ? "V" : "P"}
                              </span>
                            )}
                            <p className="flex-1 truncate text-xs text-slate-700 dark:text-slate-300">{leg.homeTeam} vs {leg.awayTeam}</p>
                            <span className="shrink-0 text-[10px] text-slate-400">{leg.prediction}</span>
                            <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{leg.odds}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 dark:border-slate-700/50">
                        <div>
                          <span className="text-[10px] text-slate-400">Stake </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">Ksh {bet.stake.toLocaleString()}</span>
                          <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-[10px] text-slate-400">Odds </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{bet.totalOdds.toFixed(2)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400">Return </span>
                          <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">Ksh {bet.potentialReturn.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {myBetsSummary && myBetsSummary.totalBets > 0 && (
              <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Return on Investment</span>
                  <span className={`text-sm font-bold ${parseFloat(myBetsSummary.roi) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {parseFloat(myBetsSummary.roi) >= 0 ? "+" : ""}{myBetsSummary.roi}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all ${parseFloat(myBetsSummary.roi) >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                    style={{ width: `${Math.min(Math.max(parseFloat(myBetsSummary.roi) + 50, 5), 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}