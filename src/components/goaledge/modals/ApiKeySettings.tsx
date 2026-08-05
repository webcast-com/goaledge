"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Trash2,
  RefreshCw,
  Shield,
  Zap,
  Globe,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface ApiKeySettingsProps {
  open: boolean;
  onClose: () => void;
  onKeySaved: () => void;
  onKeyRemoved: () => void;
  currentApiStatus: string;
}

type ValidationState = "idle" | "validating" | "success" | "error";

export function ApiKeySettings({
  open,
  onClose,
  onKeySaved,
  onKeyRemoved,
  currentApiStatus,
}: ApiKeySettingsProps) {
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationState, setValidationState] = useState<ValidationState>("idle");
  const [validationMsg, setValidationMsg] = useState("");
  const [removing, setRemoving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [savedKeySource, setSavedKeySource] = useState<string | null>(null);
  const [testData, setTestData] = useState<{
    competition?: string;
    remaining?: string | null;
    limit?: string | null;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const checkExistingKey = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/settings/api-key");
      const data = await res.json();
      if (data.configured) {
        setSavedKeySource(data.source || "unknown");
        setValidationState("success");
        setValidationMsg(
          data.source === "env"
            ? "API key loaded from .env file"
            : "API key configured and validated",
        );
        if (data.test) setTestData(data.test);
      } else if (data.error) {
        setSavedKeySource(data.source || null);
        setValidationState("error");
        setValidationMsg(data.error);
      } else {
        setSavedKeySource(null);
        setValidationState("idle");
        setValidationMsg("");
        setTestData(null);
      }
    } catch {
      setValidationState("error");
      setValidationMsg("Failed to check API key status");
    } finally {
      setChecking(false);
    }
  };

  // Check existing key status when the dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        checkExistingKey();
        setValidationState("idle");
        setValidationMsg("");
        setKeyInput("");
        setShowKey(false);
        inputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  const handleSave = async () => {
    const key = keyInput.trim();
    if (!key || key.length < 10) {
      setValidationState("error");
      setValidationMsg("Please enter a valid API key (min 10 characters)");
      return;
    }

    setValidating(true);
    setValidationState("validating");
    setValidationMsg("Validating your API key...");

    try {
      const res = await fetch("/api/settings/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();

      if (data.success) {
        setValidationState("success");
        setValidationMsg(data.message || "API key saved and validated!");
        setSavedKeySource("database");
        if (data.test) setTestData(data.test);
        if (data.warning) {
          toast.warning(data.warning);
        }
        toast.success("API key saved successfully!");
        setKeyInput("");
        onKeySaved();
      } else {
        setValidationState("error");
        setValidationMsg(data.error || "Validation failed");
        toast.error(data.error || "Failed to validate API key");
      }
    } catch {
      setValidationState("error");
      setValidationMsg("Network error — please try again");
      toast.error("Network error while saving API key");
    } finally {
      setValidating(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/settings/api-key", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSavedKeySource(null);
        setValidationState("idle");
        setValidationMsg("");
        setTestData(null);
        setKeyInput("");
        toast.success("API key removed");
        onKeyRemoved();
      } else {
        toast.error(data.error || "Failed to remove key");
      }
    } catch {
      toast.error("Failed to remove API key");
    } finally {
      setRemoving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !validating) handleSave();
    if (e.key === "Escape") onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-700/80 dark:bg-slate-900"
        onKeyDown={handleKeyDown}
      >
        {/* Header with gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-6 pb-8 pt-6">
          {/* Decorative circles */}
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-white/5" />

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Key className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Prediction API Key
                </h2>
                <p className="text-sm text-emerald-100">
                  Connect football-data.org for live data
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {/* Current status */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/50">
            {checking ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            ) : validationState === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : validationState === "error" ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600">
                <Key className="h-2.5 w-2.5 text-slate-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {checking
                  ? "Checking API status..."
                  : validationState === "success"
                    ? "API Connected"
                    : validationState === "error"
                      ? "Connection Issue"
                      : "No API Key Set"}
              </p>
              {validationMsg && (
                <p
                  className={`text-xs mt-0.5 ${
                    validationState === "success"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : validationState === "error"
                        ? "text-red-500 dark:text-red-400"
                        : "text-slate-500"
                  }`}
                >
                  {validationMsg}
                </p>
              )}
              {savedKeySource && validationState === "success" && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Source: {savedKeySource === "env" ? ".env file" : "database (UI)"}
                </p>
              )}
            </div>
            {validationState === "success" && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                ACTIVE
              </span>
            )}
          </div>

          {/* Rate limit info when connected */}
          {testData && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    Test Competition
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  {testData.competition || "N/A"}
                </p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    Rate Limit
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-blue-800 dark:text-blue-200">
                  {testData.remaining && testData.limit
                    ? `${testData.remaining} / ${testData.limit} req`
                    : "Free: 10/min"}
                </p>
              </div>
            </div>
          )}

          {/* Input section */}
          {!savedKeySource && (
            <div className="space-y-2">
              <label
                htmlFor="api-key-input"
                className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                <Shield className="h-3.5 w-3.5" />
                Your football-data.org API Key
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id="api-key-input"
                  type={showKey ? "text" : "password"}
                  value={keyInput}
                  onChange={(e) => {
                    setKeyInput(e.target.value);
                    if (validationState !== "idle") {
                      setValidationState("idle");
                      setValidationMsg("");
                    }
                  }}
                  placeholder="Paste your API key here..."
                  disabled={validating}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-20 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showKey ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Validation state indicator */}
          {validating && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5 dark:bg-blue-950/30">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Testing API key with football-data.org...
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            {savedKeySource ? (
              <>
                <button
                  onClick={handleRemove}
                  disabled={removing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  {removing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Remove Key
                </button>
                <button
                  onClick={checkExistingKey}
                  disabled={checking}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${checking ? "animate-spin" : ""}`}
                  />
                  Re-check
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  disabled={validating}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={validating || !keyInput.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-600 hover:to-teal-600 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:shadow-none"
                >
                  {validating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4" />
                  )}
                  {validating ? "Validating..." : "Save & Connect"}
                </button>
              </>
            )}
          </div>

          {/* Help section */}
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="space-y-2 text-xs text-amber-800 dark:text-amber-200">
                <p className="font-semibold">How to get your free API key:</p>
                <ol className="ml-4 list-decimal space-y-1">
                  <li>
                    Visit{" "}
                    <a
                      href="https://www.football-data.org/client/register"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 font-medium underline decoration-amber-400 underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100"
                    >
                      football-data.org <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </li>
                  <li>Create a free account</li>
                  <li>Copy your API token from the dashboard</li>
                  <li>Paste it above and click Save & Connect</li>
                </ol>
                <p className="text-amber-600 dark:text-amber-400">
                  Free tier: 10 requests/minute. Covers all major European leagues, Champions League, and more.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}