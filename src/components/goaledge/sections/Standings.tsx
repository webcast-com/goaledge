"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FadeIn } from "@/components/goaledge/animations";
import { Medal, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FullStandingsDialog } from "@/components/goaledge/modals/FullStandingsDialog";

const LEAGUES = [
  { code: "PL", label: "Premier League", flag: "\uD83E\uDD81" },
  { code: "PD", label: "La Liga", flag: "\uD83C\uDDEA\uD83C\uDDF8" },
  { code: "SA", label: "Serie A", flag: "\uD83C\uDDEE\uD83C\uDDF9" },
  { code: "BL1", label: "Bundesliga", flag: "\uD83C\uDDE9\uD83C\uDDEA" },
  { code: "FL1", label: "Ligue 1", flag: "\uD83C\uDDEB\uD83C\uDDF7" },
] as const;

type LeagueCode = (typeof LEAGUES)[number]["code"];

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
  form?: string;
}

const SEED_STANDINGS: Record<string, StandingRow[]> = {
  PL: [
    { pos: 1, team: "Arsenal", p: 28, w: 20, d: 5, l: 3, gd: "+38", pts: 65, form: "W,W,D,W,W" },
    { pos: 2, team: "Liverpool", p: 28, w: 19, d: 6, l: 3, gd: "+35", pts: 63, form: "W,W,W,D,W" },
    { pos: 3, team: "Man City", p: 28, w: 18, d: 5, l: 5, gd: "+30", pts: 59, form: "W,D,W,L,W" },
    { pos: 4, team: "Aston Villa", p: 28, w: 16, d: 4, l: 8, gd: "+18", pts: 52, form: "W,L,W,W,D" },
    { pos: 5, team: "Tottenham", p: 28, w: 15, d: 4, l: 9, gd: "+12", pts: 49, form: "L,W,D,W,W" },
  ],
  PD: [
    { pos: 1, team: "Real Madrid", p: 28, w: 21, d: 4, l: 3, gd: "+40", pts: 67, form: "W,W,W,W,D" },
    { pos: 2, team: "Barcelona", p: 28, w: 19, d: 6, l: 3, gd: "+35", pts: 63, form: "W,D,W,W,W" },
    { pos: 3, team: "Girona", p: 28, w: 18, d: 5, l: 5, gd: "+28", pts: 59, form: "W,W,D,L,W" },
    { pos: 4, team: "Atletico Madrid", p: 28, w: 17, d: 5, l: 6, gd: "+25", pts: 56, form: "D,W,W,W,L" },
    { pos: 5, team: "Athletic Club", p: 28, w: 15, d: 7, l: 6, gd: "+15", pts: 52, form: "W,L,D,W,W" },
  ],
  SA: [
    { pos: 1, team: "Inter Milan", p: 28, w: 22, d: 4, l: 2, gd: "+45", pts: 70, form: "W,W,W,D,W" },
    { pos: 2, team: "Juventus", p: 28, w: 16, d: 10, l: 2, gd: "+22", pts: 58, form: "D,W,D,W,D" },
    { pos: 3, team: "AC Milan", p: 28, w: 17, d: 5, l: 6, gd: "+18", pts: 56, form: "W,L,W,W,D" },
    { pos: 4, team: "Bologna", p: 28, w: 16, d: 6, l: 6, gd: "+12", pts: 54, form: "W,D,W,L,W" },
    { pos: 5, team: "Atalanta", p: 28, w: 15, d: 6, l: 7, gd: "+10", pts: 51, form: "L,W,W,D,W" },
  ],
  BL1: [
    { pos: 1, team: "Leverkusen", p: 28, w: 23, d: 5, l: 0, gd: "+48", pts: 74, form: "W,W,D,W,W" },
    { pos: 2, team: "Bayern Munich", p: 28, w: 18, d: 4, l: 6, gd: "+32", pts: 58, form: "W,W,L,W,W" },
    { pos: 3, team: "Stuttgart", p: 28, w: 17, d: 4, l: 7, gd: "+20", pts: 55, form: "W,D,W,W,L" },
    { pos: 4, team: "Dortmund", p: 28, w: 15, d: 6, l: 7, gd: "+15", pts: 51, form: "D,W,L,W,W" },
    { pos: 5, team: "RB Leipzig", p: 28, w: 15, d: 5, l: 8, gd: "+14", pts: 50, form: "W,L,W,D,W" },
  ],
  FL1: [
    { pos: 1, team: "PSG", p: 27, w: 22, d: 3, l: 2, gd: "+50", pts: 69, form: "W,W,W,D,W" },
    { pos: 2, team: "Brest", p: 27, w: 17, d: 6, l: 4, gd: "+18", pts: 57, form: "W,D,W,W,D" },
    { pos: 3, team: "Monaco", p: 27, w: 16, d: 6, l: 5, gd: "+16", pts: 54, form: "D,W,W,L,W" },
    { pos: 4, team: "Lille", p: 27, w: 16, d: 5, l: 6, gd: "+12", pts: 53, form: "W,L,D,W,W" },
    { pos: 5, team: "Nice", p: 27, w: 14, d: 7, l: 6, gd: "+8", pts: 49, form: "D,W,W,D,L" },
  ],
};

function parseForm(formStr?: string): string[] {
  if (!formStr) return [];
  return formStr.split(",").slice(0, 5);
}

function SkeletonTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <th className="w-8 px-4 py-3 text-center">#</th>
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
          {[...Array(5)].map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="px-4 py-3 text-center">
                <Skeleton className="mx-auto h-3 w-3 rounded" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-4 w-28 rounded" />
              </td>
              <td className="px-3 py-3 text-center">
                <Skeleton className="mx-auto h-3 w-4 rounded" />
              </td>
              <td className="px-3 py-3 text-center">
                <Skeleton className="mx-auto h-3 w-4 rounded" />
              </td>
              <td className="px-3 py-3 text-center">
                <Skeleton className="mx-auto h-3 w-4 rounded" />
              </td>
              <td className="px-3 py-3 text-center">
                <Skeleton className="mx-auto h-3 w-4 rounded" />
              </td>
              <td className="px-3 py-3 text-center hidden sm:table-cell">
                <Skeleton className="mx-auto h-3 w-6 rounded" />
              </td>
              <td className="px-4 py-3 text-center">
                <Skeleton className="mx-auto h-4 w-5 rounded" />
              </td>
              <td className="px-3 py-3 hidden sm:table-cell">
                <div className="flex justify-center gap-0.5">
                  {[...Array(5)].map((_, j) => (
                    <Skeleton key={j} className="h-5 w-5 rounded" />
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Standings() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeLeague, setActiveLeague] = useState<LeagueCode>("PL");
  const [standingsData, setStandingsData] = useState<StandingRow[]>(SEED_STANDINGS.PL);
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const fetchStandings = useCallback(async (leagueCode: LeagueCode) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/standings?league=${leagueCode}`);
      const data = await res.json();
      if (data.standings && data.standings.length > 0) {
        setStandingsData(data.standings);
      } else {
        // Fallback to seed data
        setStandingsData(SEED_STANDINGS[leagueCode] ?? []);
      }
    } catch {
      setStandingsData(SEED_STANDINGS[leagueCode] ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStandings(activeLeague);
  }, [activeLeague, fetchStandings]);

  const handleLeagueChange = (code: LeagueCode) => {
    if (code === activeLeague) return;
    setTransitioning(true);
    setTimeout(() => {
      setActiveLeague(code);
      setTransitioning(false);
    }, 150);
  };

  const activeLeagueInfo = LEAGUES.find((l) => l.code === activeLeague);

  return (
    <section
      id="standings"
      className="scroll-mt-16 border-b border-slate-200 bg-white px-4 py-16 sm:px-6 dark:border-slate-800 dark:bg-slate-900/50"
    >
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                <Medal className="h-3.5 w-3.5" /> Standings
              </span>
              <h2 className="section-heading mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                {activeLeagueInfo ? `${activeLeagueInfo.flag} ${activeLeagueInfo.label} table` : "League table"}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Top 5 teams — updated after each matchday.
              </p>
            </div>
            <button
              onClick={() => setDialogOpen(true)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700 dark:text-emerald-400"
            >
              View full table <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </FadeIn>

        {/* League Switcher Tabs */}
        <FadeIn delay={0.05}>
          <div className="mb-5 overflow-x-auto no-scrollbar">
            <div className="flex gap-2 min-w-max pb-1">
              {LEAGUES.map((league) => (
                <button
                  key={league.code}
                  onClick={() => handleLeagueChange(league.code)}
                  className={
                    `inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap ` +
                    (activeLeague === league.code
                      ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25 scale-[1.02]"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700")
                  }
                  aria-pressed={activeLeague === league.code}
                >
                  <span className="text-base leading-none">{league.flag}</span>
                  <span>{league.label}</span>
                </button>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Table with fade transition */}
        <FadeIn delay={0.1}>
          <div
            ref={tableRef}
            className={`transition-opacity duration-200 ${transitioning || loading ? "opacity-0" : "opacity-100"}`}
          >
            {loading ? (
              <SkeletonTable />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                      <th className="w-8 px-4 py-3 text-center">#</th>
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
                    {standingsData.slice(0, 5).map((row) => {
                      const form = parseForm(row.form);
                      return (
                        <tr
                          key={`${activeLeague}-${row.pos}`}
                          className="table-row-highlight transition-all hover:bg-slate-50 hover:border-l-2 hover:border-l-emerald-500 dark:hover:bg-slate-800/30 dark:hover:border-l-emerald-400"
                        >
                          <td className="px-4 py-3 text-center text-xs font-bold text-slate-400">
                            {row.pos}
                          </td>
                          <td className="px-4 py-3">
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
                              {row.pos <= 4 && (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center text-slate-500 dark:text-slate-400">
                            {row.p}
                          </td>
                          <td className="px-3 py-3 text-center font-medium text-slate-700 dark:text-slate-300">
                            {row.w}
                          </td>
                          <td className="px-3 py-3 text-center text-slate-500 dark:text-slate-400">
                            {row.d}
                          </td>
                          <td className="px-3 py-3 text-center text-slate-500 dark:text-slate-400">
                            {row.l}
                          </td>
                          <td className="px-3 py-3 text-center hidden font-medium text-emerald-600 dark:text-emerald-400 sm:table-cell">
                            {row.gd}
                          </td>
                          <td className="px-4 py-3 text-center text-base font-extrabold text-slate-900 dark:text-white">
                            {row.pts}
                          </td>
                          <td className="px-3 py-3 hidden sm:table-cell">
                            {form.length > 0 ? (
                              <div className="flex justify-center gap-0.5">
                                {form.map((r, i) => (
                                  <span
                                    key={i}
                                    className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-white ${
                                      r === "W"
                                        ? "bg-emerald-500"
                                        : r === "L"
                                          ? "bg-red-500"
                                          : "bg-amber-500"
                                    }`}
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300 dark:text-slate-600">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
              🟢 = Champions League qualification spot
            </p>
          </div>
        </FadeIn>
      </div>

      <FullStandingsDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </section>
  );
}
