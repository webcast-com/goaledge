"use client";

import {
  Radio,
  X,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Crown,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Star,
  Pencil,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AdminTab, AdminFormState, Tip } from "@/types/goaledge";

const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: "won", label: "Won", color: "text-emerald-600 dark:text-emerald-400" },
  { value: "lost", label: "Lost", color: "text-red-700 dark:text-red-400" },
  { value: "void", label: "Void", color: "text-amber-600 dark:text-amber-400" },
  { value: "pending", label: "Pending", color: "text-sky-600 dark:text-sky-400" },
  { value: "upcoming", label: "Upcoming", color: "text-violet-600 dark:text-violet-400" },
];

const EMPTY_FORM: AdminFormState = {
  league: "",
  country: "",
  flag: "⚽",
  homeTeam: "",
  awayTeam: "",
  matchTime: "",
  predictionType: "",
  prediction: "",
  odds: "",
  confidence: "75",
  confidenceLabel: "High",
  tipster: "GoalEdge_AI",
  isPremium: false,
  analysis: "",
};

export interface AdminPanelProps {
  open: boolean;
  tab: AdminTab;
  tips: Tip[];
  form: AdminFormState;
  loading: boolean;
  editingId: string | null;
  onClose: () => void;
  onSetTab: (t: AdminTab) => void;
  onSetForm: (f: AdminFormState) => void;
  onSetLoading: (l: boolean) => void;
  onSetEditingId: (id: string | null) => void;
  onFetchTips: () => void;
}

export function AdminPanel({
  open,
  tab,
  tips,
  form,
  loading,
  editingId,
  onClose,
  onSetTab,
  onSetForm,
  onSetLoading,
  onSetEditingId,
  onFetchTips,
}: AdminPanelProps) {
  const [resultLoadingId, setResultLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tip | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleEdit = useCallback(
    (tip: Tip) => {
      onSetForm({
        league: tip.league,
        country: tip.country,
        flag: tip.flag,
        homeTeam: tip.homeTeam,
        awayTeam: tip.awayTeam,
        matchTime: tip.matchTime,
        predictionType: tip.predictionType,
        prediction: tip.prediction,
        odds: tip.odds,
        confidence: String(tip.confidence),
        confidenceLabel: tip.confidenceLabel,
        tipster: tip.tipster,
        isPremium: tip.isPremium,
        analysis: tip.analysis || "",
      });
      onSetEditingId(tip.id);
      onSetTab("create");
    },
    [onSetForm, onSetEditingId, onSetTab]
  );

  const handleSetResult = useCallback(
    async (tipId: string, status: string) => {
      setResultLoadingId(tipId);
      try {
        const res = await fetch("/api/admin/tips", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: tipId, status }),
        });
        if (res.ok) {
          toast.success(`Tip marked as ${status}!`);
          onFetchTips();
        } else {
          toast.error("Failed to update tip status");
        }
      } catch {
        toast.error("Network error");
      } finally {
        setResultLoadingId(null);
      }
    },
    [onFetchTips]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/tips?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Tip deleted successfully");
        onFetchTips();
      } else {
        toast.error("Failed to delete tip");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, onFetchTips]);

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      onSetLoading(true);
      try {
        const payload = { ...form, confidence: Number(form.confidence) };

        if (editingId) {
          const res = await fetch("/api/admin/tips", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingId, ...payload }),
          });
          if (res.ok) {
            toast.success("Tip updated!");
            onSetForm(EMPTY_FORM);
            onSetEditingId(null);
            onSetTab("tips");
            onFetchTips();
          } else {
            toast.error("Failed to update tip");
          }
        } else {
          const res = await fetch("/api/admin/tips", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            toast.success("Tip created!");
            onSetForm(EMPTY_FORM);
            onFetchTips();
          } else {
            toast.error("Failed to create tip");
          }
        }
      } catch {
        toast.error("Network error");
      } finally {
        onSetLoading(false);
      }
    },
    [form, editingId, onSetLoading, onSetForm, onSetEditingId, onSetTab, onFetchTips]
  );

  const handleCancelEdit = useCallback(() => {
    onSetForm(EMPTY_FORM);
    onSetEditingId(null);
    onSetTab("tips");
  }, [onSetForm, onSetEditingId, onSetTab]);

  return (
    <>
      {/* ==================== ADMIN DASHBOARD MODAL ==================== */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="auth-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-emerald-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Admin Dashboard</h3>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-6 dark:border-slate-800">
              {(["tips", "create", "stats"] as const).map((t) => (
                <button key={t} onClick={() => { onSetTab(t); if (t === "tips") { onFetchTips(); onSetEditingId(null); } }} className={`px-4 py-3 text-sm font-semibold transition border-b-2 capitalize ${
                  tab === t ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}>
                  {t === "tips" ? "Tips Management" : t === "create" ? (editingId ? "Edit Tip" : "Create Tip") : "Stats"}
                </button>
              ))}
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {tab === "tips" && (
                <div className="space-y-3">
                  {tips.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-sm text-slate-400">No tips loaded. Check API.</p>
                      <button onClick={onFetchTips} className="mt-3 text-sm font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">Refresh</button>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {tips.map((tip) => (
                        <div key={tip.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{tip.homeTeam} vs {tip.awayTeam}</p>
                            <p className="text-xs text-slate-400">{tip.league} · {tip.prediction} @ {tip.odds}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            tip.status === "won" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" :
                            tip.status === "lost" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                            tip.status === "void" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                            "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                          }`}>{tip.status}</span>
                          {tip.isPremium && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">PRO</span>}
                          <div className="flex gap-1">
                            {/* Edit Button */}
                            <button
                              onClick={() => handleEdit(tip)}
                              className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
                              title="Edit tip"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            {/* Result Button */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-slate-700 dark:hover:bg-emerald-900/30 disabled:opacity-50"
                                  disabled={resultLoadingId === tip.id}
                                  title="Set result"
                                >
                                  {resultLoadingId === tip.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3" />
                                  )}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                {STATUS_OPTIONS.map((opt) => (
                                  <DropdownMenuItem
                                    key={opt.value}
                                    onClick={() => handleSetResult(tip.id, opt.value)}
                                    className={opt.color}
                                  >
                                    {opt.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            {/* Delete Button */}
                            <button
                              onClick={() => setDeleteTarget(tip)}
                              className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-red-100 hover:text-red-700 dark:bg-slate-700 dark:hover:bg-red-900/30"
                              title="Delete tip"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {tab === "create" && (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-slate-500 mb-1">League</label><input value={form.league} onChange={e => onSetForm({ ...form, league: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" required /></div>
                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Country</label><input value={form.country} onChange={e => onSetForm({ ...form, country: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" required /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Home Team</label><input value={form.homeTeam} onChange={e => onSetForm({ ...form, homeTeam: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" required /></div>
                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Away Team</label><input value={form.awayTeam} onChange={e => onSetForm({ ...form, awayTeam: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" required /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Match Time</label><input value={form.matchTime} onChange={e => onSetForm({ ...form, matchTime: e.target.value })} placeholder="16 Jul, 21:45" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" required /></div>
                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Odds</label><input type="number" step="0.01" value={form.odds} onChange={e => onSetForm({ ...form, odds: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" required /></div>
                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Confidence</label><input type="number" min="1" max="99" value={form.confidence} onChange={e => onSetForm({ ...form, confidence: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" required /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Prediction Type</label><input value={form.predictionType} onChange={e => onSetForm({ ...form, predictionType: e.target.value })} placeholder="Match Result" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" required /></div>
                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Prediction</label><input value={form.prediction} onChange={e => onSetForm({ ...form, prediction: e.target.value })} placeholder="Home Win" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" required /></div>
                  </div>
                  <div><label className="block text-xs font-medium text-slate-500 mb-1">Analysis</label><textarea value={form.analysis} onChange={e => onSetForm({ ...form, analysis: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => onSetForm({ ...form, isPremium: !form.isPremium })} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${form.isPremium ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                      <Crown className="h-3.5 w-3.5" /> Premium
                    </button>
                  </div>
                  <div className="flex gap-3">
                    {editingId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                    )}
                    <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50">
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          {editingId ? "Updating..." : "Creating..."}
                        </span>
                      ) : editingId ? "Update Tip" : "Create Tip"}
                    </button>
                  </div>
                </form>
              )}
              {tab === "stats" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Total Tips", value: "1,247", icon: <Target className="h-5 w-5" />, color: "text-emerald-600 dark:text-emerald-400" },
                    { label: "Win Rate", value: "53.2%", icon: <TrendingUp className="h-5 w-5" />, color: "text-emerald-600 dark:text-emerald-400" },
                    { label: "Total Users", value: "2,841", icon: <Users className="h-5 w-5" />, color: "text-emerald-600 dark:text-emerald-400" },
                    { label: "Premium Users", value: "487", icon: <Crown className="h-5 w-5" />, color: "text-amber-600 dark:text-amber-400" },
                    { label: "Revenue (30d)", value: "Ksh 48.7K", icon: <Wallet className="h-5 w-5" />, color: "text-emerald-600 dark:text-emerald-400" },
                    { label: "Avg Rating", value: "4.8/5", icon: <Star className="h-5 w-5" />, color: "text-amber-600 dark:text-amber-400" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-center dark:border-slate-700 dark:bg-slate-800/50">
                      <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 ${s.color} dark:bg-emerald-900/30`}>{s.icon}</div>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== DELETE CONFIRMATION DIALOG ==================== */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tip? This action cannot be undone.
              {deleteTarget && (
                <span className="block mt-2 font-semibold text-slate-900 dark:text-white">
                  {deleteTarget.homeTeam} vs {deleteTarget.awayTeam}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
            >
              {deleteLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}