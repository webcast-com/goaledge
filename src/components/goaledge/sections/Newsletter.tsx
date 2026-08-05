"use client";

import { FadeIn } from "@/components/goaledge/animations";
import {
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  Clock,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export function Newsletter({
  email,
  loading,
  subscribed,
  onSetEmail,
  onSetSubscribed,
  onSetLoading,
}: {
  email: string;
  loading: boolean;
  subscribed: boolean;
  onSetEmail: (v: string) => void;
  onSetSubscribed: (v: boolean) => void;
  onSetLoading: (v: boolean) => void;
}) {
  return (
    <section className="border-b border-slate-200 newsletter-mesh bg-white px-4 py-16 sm:px-6 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mx-auto max-w-2xl text-center">
        <FadeIn>
          <span className="section-badge inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <Mail className="h-3.5 w-3.5" /> Newsletter
          </span>
          <h2 className="section-heading mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Never miss a winning tip
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Get free daily tips, odds alerts, and exclusive analysis delivered to your inbox. Join 1,200+ subscribers.
          </p>
        </FadeIn>

        <FadeIn delay={0.15}>
          {subscribed ? (
            <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800/50 dark:bg-emerald-950/30">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="mt-3 text-base font-bold text-slate-900 dark:text-white">You&apos;re in! 🎉</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Check your inbox for a welcome email with your first free premium tip.
              </p>
            </div>
          ) : (
            <div className="mt-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <div className="relative flex-1">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => onSetEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-500"
                    onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("newsletter-btn")?.click(); }}
                  />
                </div>
                <button
                  id="newsletter-btn"
                  disabled={loading || !email.trim()}
                  onClick={async () => {
                    if (!email.trim()) return;
                    onSetLoading(true);
                    try {
                      const res = await fetch("/api/newsletter", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: email }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        onSetSubscribed(true);
                        toast.success(data.message);
                      } else {
                        toast.error(data.error || "Something went wrong");
                      }
                    } catch {
                      toast.error("Network error. Please try again.");
                    } finally {
                      onSetLoading(false);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 active:translate-y-0"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Subscribe Free
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
                <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-500" /> No spam, ever</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-emerald-500" /> Unsubscribe anytime</span>
                <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-emerald-500" /> Free premium tip on signup</span>
              </div>
            </div>
          )}
        </FadeIn>
      </div>
    </section>
  );
}