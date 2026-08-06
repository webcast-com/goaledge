"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  X,
  Crown,
  CheckCircle2,
  Zap,
  ChartColumn,
  TrendingUp,
  Radio,
  ShieldCheck,
  Eye,
  Mail,
  RefreshCw,
  Lock,
} from "lucide-react";

export function PaymentFlowModal({
  email: initialEmail,
  onClose,
  onAuthenticated,
}: {
  email: string;
  onClose: () => void;
  onAuthenticated: (email: string) => void;
}) {
  const [step, setStep] = useState<"form" | "processing" | "success" | "error">("form");
  const [selectedPlan, setSelectedPlan] = useState<"daily" | "weekly" | "monthly">("daily");
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const plans = [
    { key: "daily" as const, label: "Daily Pass", price: "Ksh 100", sub: "24 hours access", popular: false, amount: 100 },
    { key: "weekly" as const, label: "Weekly Pass", price: "Ksh 500", sub: "7 days access", popular: true, amount: 500 },
    { key: "monthly" as const, label: "Monthly Pass", price: "Ksh 1,500", sub: "30 days access", popular: false, amount: 1500 },
  ];

  const currentPlan = plans.find(p => p.key === selectedPlan)!;

  const handlePay = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setErrorMsg("");
    setStep("processing");

    try {
      // 1. Initiate payment
      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), amount: currentPlan.amount, plan: selectedPlan }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Payment initiation failed");
        setStep("error");
        setLoading(false);
        return;
      }

      setPaymentRef(data.reference);

      // 2. Real Paystack popup — used when NEXT_PUBLIC_PAYSTACK_KEY is configured.
      const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_KEY;
      if (publicKey) {
        try {
          await new Promise<void>((resolve, reject) => {
            const existing = document.getElementById("paystack-inline-script");
            if (existing) return resolve();
            const script = document.createElement("script");
            script.id = "paystack-inline-script";
            script.src = "https://js.paystack.co/v2/inline.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Paystack"));
            document.body.appendChild(script);
          });

          const popup = (window as unknown as { PaystackPop?: { setup: (opts: Record<string, unknown>) => { openIframe: () => void } } }).PaystackPop;
          if (!popup) throw new Error("Paystack unavailable");

          popup.setup({
            key: publicKey,
            email: email.trim(),
            amount: currentPlan.amount * 100, // Paystack expects cents
            currency: "KES",
            ref: data.reference,
            onClose: () => {
              setStep("form");
              setLoading(false);
            },
            callback: async () => {
              // Verify the charge server-side before unlocking premium
              const verifyRes = await fetch("/api/payment/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reference: data.reference }),
              });
              const verifyData = await verifyRes.json();
              if (verifyData.status === "success") {
                setStep("success");
                onAuthenticated(email.trim());
              } else {
                setErrorMsg(verifyData.error || "Payment verification failed");
                setStep("error");
              }
              setLoading(false);
            },
          }).openIframe();
          return; // popup owns the flow from here
        } catch {
          // Fall through to demo simulation if the Paystack script can't load
          setErrorMsg("");
        }
      }

      // 3. Demo simulation (auto-verify after 2s) — used when no public key is set
      await new Promise(r => setTimeout(r, 2000));
      const verifyRes = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: data.reference }),
      });
      const verifyData = await verifyRes.json();
      if (verifyData.status === "success") {
        setStep("success");
        onAuthenticated(email.trim());
      } else {
        setErrorMsg("Payment verification failed");
        setStep("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step === "processing" ? undefined : onClose} />
      <div className="payment-modal-slide relative w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-2xl sm:max-w-md">
        {/* Processing Step */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-emerald-200 dark:border-emerald-900" />
              <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-emerald-500" />
            </div>
            <p className="mt-6 text-lg font-bold text-slate-900 dark:text-white">Processing Payment</p>
            <p className="mt-1 text-sm text-slate-400">Connecting to Paystack securely...</p>
            <p className="mt-4 text-xs text-slate-300 dark:text-slate-600">Ref: {paymentRef}</p>
          </div>
        )}

        {/* Success Step */}
        {step === "success" && (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">Payment Successful!</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Welcome to Premium. You now have {selectedPlan === "daily" ? "24 hours" : selectedPlan === "weekly" ? "7 days" : "30 days"} of unlimited access.
            </p>
            <div className="mt-6 w-full rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Plan</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{currentPlan.label}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Amount</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{currentPlan.price}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Reference</span>
                <span className="font-mono text-xs text-slate-400">{paymentRef}</span>
              </div>
            </div>
            <button onClick={onClose} className="mt-6 w-full rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition hover:from-emerald-500 hover:to-emerald-700">
              Start Using Premium
            </button>
          </div>
        )}

        {/* Error Step */}
        {step === "error" && (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <X className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">Payment Failed</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{errorMsg || "Something went wrong. Please try again."}</p>
            <div className="mt-6 flex w-full gap-3">
              <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={() => setStep("form")} className="flex-1 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition hover:from-emerald-500 hover:to-emerald-700">Try Again</button>
            </div>
          </div>
        )}

        {/* Form Step */}
        {step === "form" && (
          <>
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
              <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30 z-10">
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                  <Crown className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Upgrade to Premium</h3>
                  <p className="text-xs text-emerald-200">Unlock unlimited tips and expert analysis</p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {/* Plan Selection */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {plans.map((plan) => (
                  <button
                    key={plan.key}
                    onClick={() => setSelectedPlan(plan.key)}
                    className={`relative flex flex-col items-center rounded-xl border-2 p-3 text-center transition-all ${
                      selectedPlan === plan.key
                        ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-400 dark:bg-emerald-950/20"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">BEST VALUE</span>
                    )}
                    <p className={`text-[11px] font-bold ${selectedPlan === plan.key ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>{plan.label}</p>
                    <p className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">{plan.price}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{plan.sub}</p>
                  </button>
                ))}
              </div>

              {/* Benefits */}
              <div className="mb-5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {[
                  { icon: <Zap className="h-3.5 w-3.5" />, text: "Unlimited premium tips" },
                  { icon: <ChartColumn className="h-3.5 w-3.5" />, text: "In-depth analysis" },
                  { icon: <TrendingUp className="h-3.5 w-3.5" />, text: "Accumulator picks" },
                  { icon: <Radio className="h-3.5 w-3.5" />, text: "Real-time odds alerts" },
                  { icon: <ShieldCheck className="h-3.5 w-3.5" />, text: "Priority support" },
                  { icon: <Eye className="h-3.5 w-3.5" />, text: "Full match stats & xG" },
                ].map((b) => (
                  <div key={b.text} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="text-emerald-500">{b.icon}</span>
                    {b.text}
                  </div>
                ))}
              </div>

              {/* Email */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Pay Button */}
              <button
                disabled={loading || !email.trim()}
                onClick={handlePay}
                className="w-full rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition-all hover:from-emerald-500 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Processing...</span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Pay {currentPlan.price} with
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5">
                      <span className="text-xs font-bold">Paystack</span>
                    </span>
                  </span>
                )}
              </button>

              {/* Trust badges */}
              <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-500" /> Secured by Paystack</span>
                <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-emerald-500" /> 256-bit SSL</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}