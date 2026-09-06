"use client";

import { useRef, useState } from "react";
import { X, RefreshCw, ArrowLeft, Mail, Gift, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/session-context";

export interface AuthModalProps {
  open: boolean;
  mode: "signin" | "signup";
  error: string;
  loading: boolean;
  name: string;
  email: string;
  password: string;
  confirm: string;
  referralCode: string;
  onClose: () => void;
  onSetMode: (m: "signin" | "signup") => void;
  onSetError: (e: string) => void;
  onSetLoading: (l: boolean) => void;
  onSetName: (n: string) => void;
  onSetEmail: (e: string) => void;
  onSetPassword: (p: string) => void;
  onSetConfirm: (c: string) => void;
  onSetReferralCode: (v: string) => void;
}

export function AuthModal({
  open,
  mode,
  error,
  loading,
  name,
  email,
  password,
  confirm,
  referralCode,
  onClose,
  onSetMode,
  onSetError,
  onSetLoading,
  onSetName,
  onSetEmail,
  onSetPassword,
  onSetConfirm,
  onSetReferralCode,
}: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [refStatus, setRefStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");
  const [refName, setRefName] = useState("");
  const refTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validateReferralCode = (code: string) => {
    if (refTimeout.current) clearTimeout(refTimeout.current);
    const trimmed = code.trim();
    if (!trimmed) {
      setRefStatus("idle");
      setRefName("");
      return;
    }
    if (trimmed.length < 4) {
      setRefStatus("idle");
      return;
    }
    refTimeout.current = setTimeout(async () => {
      setRefStatus("validating");
      try {
        const res = await fetch("/api/referrals/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: trimmed }),
        });
        const data = await res.json();
        if (data.valid) {
          setRefStatus("valid");
          setRefName(data.referrerName || "");
        } else {
          setRefStatus("invalid");
          setRefName("");
        }
      } catch {
        setRefStatus("idle");
        setRefName("");
      }
    }, 500);
  };

  const handleResetSubmit = async () => {
    if (!resetEmail.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Reset link sent to your email!");
        setResetMode(false);
        setResetEmail("");
      } else {
        toast.error(data.error || "Something went wrong");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <>
      {/* ==================== AUTH DIALOG ==================== */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 text-white">
              {resetMode ? (
                <button
                  onClick={() => { setResetMode(false); setResetEmail(""); onSetError(""); }}
                  className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : null}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="text-xl font-bold">
                {resetMode ? "Reset password" : mode === "signin" ? "Welcome back" : "Create your account"}
              </h3>
              <p className="mt-1 text-sm text-emerald-100">
                {resetMode
                  ? "We'll send you a reset link"
                  : mode === "signin"
                  ? "Sign in to access your predictions"
                  : "Join GoalEdge and start winning"}
              </p>
            </div>

            {/* Body */}
            <div className="p-6">
              {resetMode ? (
                <>
                  <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 mx-auto mb-4 dark:bg-emerald-900/20 dark:border-emerald-800/50">
                    <Mail className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-5">
                    Enter the email address associated with your account and we'll send you a link to reset your password.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email address</label>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        disabled={resetLoading}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleResetSubmit}
                      disabled={resetLoading}
                      className="h-11 w-full rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-all hover:from-emerald-500 hover:to-emerald-700 hover:shadow-emerald-500/40 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {resetLoading ? (
                        <span className="flex items-center justify-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Sending...</span>
                      ) : (
                        "Send reset link"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setResetMode(false); setResetEmail(""); onSetError(""); }}
                      className="w-full text-center text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
                    >
                      Back to sign in
                    </button>
                  </div>
                </>
              ) : (
              <>
              {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:border-red-800/50 dark:text-red-400">
                  {error}
                </div>
              )}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  onSetError("");

                  if (mode === "signup") {
                    if (password !== confirm) {
                      onSetError("Passwords do not match");
                      return;
                    }
                    if (password.length < 6) {
                      onSetError("Password must be at least 6 characters");
                      return;
                    }
                  }

                  onSetLoading(true);
                  // Plain fetch + HttpOnly session cookie — no CSRF token and no
                  // full-page form submit, so the dialog just closes on success.
                  const result =
                    mode === "signin"
                      ? await signIn(email, password)
                      : await signUp({
                          name,
                          email,
                          password,
                          referralCode: referralCode.trim() || undefined,
                        });
                  onSetLoading(false);

                  if (!result.ok) {
                    onSetError(
                      result.error ||
                        (mode === "signin" ? "Sign in failed" : "Registration failed")
                    );
                    return;
                  }

                  const signedInName =
                    mode === "signup"
                      ? name.trim()
                      : result.session?.user?.name?.trim() || "";
                  onSetPassword("");
                  onSetConfirm("");
                  onClose();

                  if (mode === "signup") {
                    toast.success(
                      result.referral?.applied
                        ? `Account created — ${result.referral.bonusDays} free premium days added!`
                        : "Account created — you're signed in!"
                    );
                  } else {
                    toast.success(
                      signedInName
                        ? `Welcome back, ${signedInName.split(" ")[0]}!`
                        : "Welcome back!"
                    );
                  }
                }}
                className="space-y-4"
              >
                {mode === "signup" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Full name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => onSetName(e.target.value)}
                      placeholder="John Doe"
                      required
                      disabled={loading}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => onSetEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => onSetPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"
                  />
                </div>
                {mode === "signup" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm password</label>
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => onSetConfirm(e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"
                    />
                  </div>
                )}
                {mode === "signup" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Referral code <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={referralCode}
                        onChange={(e) => {
                          onSetReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10));
                          validateReferralCode(e.target.value);
                        }}
                        placeholder="e.g. K7X2PQ"
                        disabled={loading}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm uppercase text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        {refStatus === "validating" && <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />}
                        {refStatus === "valid" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        {refStatus === "invalid" && <X className="h-4 w-4 text-red-400" />}
                      </span>
                    </div>
                    {refStatus === "valid" && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <Gift className="h-3 w-3" /> Code from {refName} — you'll get 2 free premium days!
                      </p>
                    )}
                    {refStatus === "invalid" && (
                      <p className="mt-1.5 text-xs font-medium text-red-500 dark:text-red-400">
                        That code doesn't exist — check and try again, or leave it empty.
                      </p>
                    )}
                    {refStatus === "idle" && (
                      <p className="mt-1.5 text-xs text-slate-400">
                        Invited by a friend? Enter their code for 2 free premium days.
                      </p>
                    )}
                  </div>
                )}
                {mode === "signin" && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => { setResetMode(true); onSetError(""); }}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-all hover:from-emerald-500 hover:to-emerald-700 hover:shadow-emerald-500/40 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> {mode === "signin" ? "Signing in..." : "Creating account..."}</span>
                  ) : (
                    mode === "signin" ? "Sign in" : "Create account"
                  )}
                </button>
              </form>
              <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
                {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => { onSetMode(mode === "signin" ? "signup" : "signin"); onSetError(""); }}
                  className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  {mode === "signin" ? "Sign up" : "Sign in"}
                </button>
              </p>
              </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}