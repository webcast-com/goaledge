"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Medal, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const LEAGUES = [
  { code: "PL", label: "Premier League", short: "PL" },
  { code: "PD", label: "La Liga", short: "LL" },
  { code: "SA", label: "Serie A", short: "SA" },
  { code: "BL1", label: "Bundesliga", short: "BL" },
  { code: "FL1", label: "Ligue 1", short: "L1" },
  { code: "PPL", label: "NPFL", short: "NPFL" },
] as const;

interface StandingRow {
  pos: number;
  team: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gd: string;
  pts: number;
  crest?: string;
  form?: string[];
}

interface StandingsResponse {
  standings: StandingRow[];
  competition?: string;
  emblem?: string;
  source: string;
}

function getQualIndicator(pos: number, total: number) {
  if (pos <= 4) return "cl";
  if (pos <= 6) return "el";
  if (pos > total - 3) return "rel";
  return null;
}

function QualBadge({ type }: { type: string }) {
  if (type === "cl") {
    return (
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" title="Champions League" />
    );
  }
  if (type === "el") {
    return (
      <span className="inline-block h-2 w-2 rounded-full bg-amber-500" title="Europa League" />
    );
  }
  if (type === "rel") {
    return (
      <span className="inline-block h-2 w-2 rounded-full bg-red-500" title="Relegation" />
    );
  }
  return null;
}

function FormBadge({ result }: { result: string }) {
  const color =
    result === "W"
      ? "bg-emerald-500"
      : result === "L"
        ? "bg-red-500"
        : "bg-amber-500";
  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-white ${color}`}
    >
      {result}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3 text-center">
        <div className="mx-auto h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="px-3 py-3 text-center">
        <div className="mx-auto h-3 w-4 rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="px-3 py-3 text-center">
        <div className="mx-auto h-3 w-4 rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="px-3 py-3 text-center">
        <div className="mx-auto h-3 w-4 rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="px-3 py-3 text-center">
        <div className="mx-auto h-3 w-4 rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="px-3 py-3 text-center hidden sm:table-cell">
        <div className="mx-auto h-3 w-6 rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="px-4 py-3 text-center">
        <div className="mx-auto h-3.5 w-5 rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="px-3 py-3 hidden sm:table-cell">
        <div className="flex justify-center gap-0.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-5 w-5 rounded bg-slate-200 dark:bg-slate-700"
            />
          ))}
        </div>
      </td>
    </tr>
  );
}

function StandingsTable({ data }: { data: StandingRow[] }) {
  const total = data.length;

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          No standings data available
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Check back after the season starts.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full min-w-[540px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <th className="w-10 px-4 py-3 text-center">#</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-3 py-3 text-center">P</th>
            <th className="px-3 py-3 text-center">W</th>
            <th className="px-3 py-3 text-center">D</th>
            <th className="px-3 py-3 text-center">L</th>
            <th className="px-3 py-3 text-center hidden sm:table-cell">GD</th>
            <th className="px-4 py-3 text-center font-bold">Pts</th>
            <th className="px-3 py-3 text-center hidden sm:table-cell">Form</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
          {data.map((row) => {
            const qual = getQualIndicator(row.pos, total);
            return (
              <tr
                key={row.pos}
                className="table-row-highlight transition-all hover:bg-slate-50 hover:border-l-2 hover:border-l-emerald-500 dark:hover:bg-slate-800/30 dark:hover:border-l-emerald-400"
              >
                <td className="px-4 py-2.5 text-center text-xs font-bold text-slate-400">
                  <span className="flex items-center justify-center gap-1.5">
                    <QualBadge type={qual ?? ""} />
                    {row.pos}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                    {row.crest ? (
                      <img
                        src={row.crest}
                        alt=""
                        className="h-5 w-5 object-contain"
                        loading="lazy"
                      />
                    ) : null}
                    {row.team}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center text-slate-500 dark:text-slate-400">
                  {row.p}
                </td>
                <td className="px-3 py-2.5 text-center font-medium text-slate-700 dark:text-slate-300">
                  {row.w}
                </td>
                <td className="px-3 py-2.5 text-center text-slate-500 dark:text-slate-400">
                  {row.d}
                </td>
                <td className="px-3 py-2.5 text-center text-slate-500 dark:text-slate-400">
                  {row.l}
                </td>
                <td className="px-3 py-2.5 text-center hidden font-medium text-emerald-600 dark:text-emerald-400 sm:table-cell">
                  {row.gd}
                </td>
                <td className="px-4 py-2.5 text-center text-base font-extrabold text-slate-900 dark:text-white">
                  {row.pts}
                </td>
                <td className="px-3 py-2.5 hidden sm:table-cell">
                  {row.form && row.form.length > 0 ? (
                    <div className="flex justify-center gap-0.5">
                      {row.form.slice(0, 5).map((r, i) => (
                        <FormBadge key={i} result={r} />
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface FullStandingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function FullStandingsDialog({ open, onClose }: FullStandingsDialogProps) {
  const [activeLeague, setActiveLeague] = useState("PL");
  const [standingsData, setStandingsData] = useState<Record<string, StandingRow[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [fetched, setFetched] = useState<Record<string, boolean>>({});

  const fetchStandings = useCallback(async (leagueCode: string) => {
    if (fetched[leagueCode]) return;
    setLoading((prev) => ({ ...prev, [leagueCode]: true }));
    try {
      const res = await fetch(`/api/standings?league=${leagueCode}`);
      const data: StandingsResponse = await res.json();
      if (data.standings) {
        setStandingsData((prev) => ({ ...prev, [leagueCode]: data.standings }));
      }
      setFetched((prev) => ({ ...prev, [leagueCode]: true }));
    } catch {
      setFetched((prev) => ({ ...prev, [leagueCode]: true }));
    } finally {
      setLoading((prev) => ({ ...prev, [leagueCode]: false }));
    }
  }, [fetched]);

  // Fetch data for the active tab
  useEffect(() => {
    if (open) {
      fetchStandings(activeLeague);
    }
  }, [open, activeLeague, fetchStandings]);

  // Pre-fetch PL data when dialog opens
  useEffect(() => {
    if (open && !fetched["PL"]) {
      fetchStandings("PL");
    }
  }, [open, fetchStandings, fetched]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 animate-in fade-in zoom-in-95"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Medal className="h-5 w-5" />
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Full League Standings
                </DialogTitle>
                <DialogDescription className="text-xs text-emerald-100 mt-0.5">
                  Complete table with qualification indicators
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* League Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800 px-4 pt-4 shrink-0">
          <Tabs value={activeLeague} onValueChange={setActiveLeague}>
            <TabsList className="w-full overflow-x-auto no-scrollbar">
              {LEAGUES.map((league) => (
                <TabsTrigger
                  key={league.code}
                  value={league.code}
                  className="text-xs px-3 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 dark:data-[state=active]:bg-emerald-900/20 dark:data-[state=active]:text-emerald-400"
                >
                  {league.short}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Table Content */}
        <div className="overflow-y-auto flex-1 max-h-[55vh]">
          {loading[activeLeague] ? (
            <div className="p-4">
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                      <th className="w-10 px-4 py-3" />
                      <th className="px-4 py-3" />
                      <th className="px-3 py-3" />
                      <th className="px-3 py-3" />
                      <th className="px-3 py-3" />
                      <th className="px-3 py-3" />
                      <th className="px-3 py-3 hidden sm:table-cell" />
                      <th className="px-4 py-3" />
                      <th className="px-3 py-3 hidden sm:table-cell" />
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(10)].map((_, i) => (
                      <SkeletonRow key={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                <StandingsTable data={standingsData[activeLeague] ?? []} />
              </div>
            </div>
          )}
        </div>

        {/* Legend Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-3 shrink-0">
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Champions League
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Europa League
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Relegation
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}