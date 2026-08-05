"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "@/components/goaledge/animations";
import { Gamepad2, Trophy } from "lucide-react";
import { toast } from "sonner";
import type { Tip } from "@/types/goaledge";

export function QuickPredict({
  tips,
  quickPredictions,
  predictSubmitted,
  predictResults,
  onSetQuickPredictions,
  onSetPredictSubmitted,
  onSetPredictResults,
}: {
  tips: Tip[];
  quickPredictions: Record<string, "1" | "X" | "2">;
  predictSubmitted: boolean;
  predictResults: Record<string, "won" | "lost" | null>;
  onSetQuickPredictions: (v: Record<string, "1" | "X" | "2">) => void;
  onSetPredictSubmitted: (v: boolean) => void;
  onSetPredictResults: (v: Record<string, "won" | "lost" | null>) => void;
}) {
  return (
    <section className="relative mx-auto max-w-6xl overflow-hidden px-4 py-16 sm:px-6" data-section-predict>
      <FadeIn>
        <div className="mb-8 text-center">
          <span className="section-badge mb-3 inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            <Gamepad2 className="h-3.5 w-3.5" /> DAILY CHALLENGE
          </span>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Quick Predict &amp; Win</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Predict today&apos;s matches. How many can you get right?</p>
        </div>
      </FadeIn>

      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tips.slice(0, 3).map((tip) => (
          <StaggerItem key={tip.id}>
            <div className="quick-predict-card overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{tip.flag}</span>
                  <div>
                    <p className="text-xs font-medium text-slate-400">{tip.league}</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{tip.homeTeam} vs {tip.awayTeam}</p>
                  </div>
                </div>
                {predictResults[tip.id] && (
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${predictResults[tip.id] === "won" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>
                    {predictResults[tip.id] === "won" ? "✓ Correct" : "✗ Wrong"}
                  </span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {(["1", "X", "2"] as const).map((pred) => (
                  <button
                    key={pred}
                    disabled={predictSubmitted}
                    onClick={() => onSetQuickPredictions({ ...quickPredictions, [tip.id]: pred })}
                    className={`rounded-xl border-2 py-3 text-center text-sm font-bold transition-all ${
                      quickPredictions[tip.id] === pred
                        ? "border-purple-500 bg-purple-50 text-purple-700 dark:border-purple-400 dark:bg-purple-950/20 dark:text-purple-400"
                        : predictSubmitted
                          ? "border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-600"
                          : "border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:bg-purple-50/50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-800 dark:text-slate-300"
                    }`}
                  >
                    {pred === "1" ? tip.homeTeam.split(" ").pop() : pred === "X" ? "Draw" : tip.awayTeam.split(" ").pop()}
                  </button>
                ))}
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <div className="mt-6 flex flex-col items-center gap-3">
        {!predictSubmitted ? (
          <button
            disabled={Object.keys(quickPredictions).length < 3}
            onClick={() => {
              onSetPredictSubmitted(true);
              const results: Record<string, "won" | "lost"> = {};
              tips.slice(0, 3).forEach(t => {
                results[t.id] = Math.random() > 0.4 ? "won" : "lost";
              });
              onSetPredictResults(results);
              const correct = Object.values(results).filter(r => r === "won").length;
              toast.success(`🎯 ${correct}/3 correct! ${correct === 3 ? "Perfect score! 🏆" : correct >= 2 ? "Great predictions!" : "Better luck tomorrow!"}`);
            }}
            className="rounded-xl bg-gradient-to-b from-purple-500 to-purple-600 px-8 py-3 text-sm font-bold text-white shadow-sm shadow-purple-600/20 transition-all hover:from-purple-500 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit Predictions ({Object.keys(quickPredictions).length}/3)
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-xl bg-purple-50 px-4 py-2 dark:bg-purple-950/20">
              <Trophy className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-bold text-purple-700 dark:text-purple-400">
                {Object.values(predictResults).filter(r => r === "won").length}/3 Correct
              </span>
            </div>
            <button
              onClick={() => { onSetPredictSubmitted(false); onSetQuickPredictions({}); onSetPredictResults({}); }}
              className="text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </section>
  );
}