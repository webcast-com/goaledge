import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CopySlipButton } from "./copy-button";

interface SlipLeg {
  homeTeam: string;
  awayTeam: string;
  league: string;
  prediction: string;
  predictionType: string;
  odds: string;
  matchTime: string;
}

async function getSlip(slug: string) {
  const slip = await db.sharedSlip.findUnique({ where: { slug } });
  if (!slip) return null;
  let legs: SlipLeg[] = [];
  try {
    const parsed = JSON.parse(slip.legs);
    legs = Array.isArray(parsed) ? parsed : [];
  } catch {
    // ignore
  }
  return { ...slip, legs };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const slip = await getSlip(slug);
  if (!slip || slip.legs.length === 0) return { title: "Slip not found — GoalEdge" };

  const first = slip.legs[0];
  const title =
    slip.legs.length === 1
      ? `${first.homeTeam} vs ${first.awayTeam} — shared slip | GoalEdge`
      : `${slip.legs.length}-fold accumulator — shared slip | GoalEdge`;

  return {
    title,
    description: `${first.prediction} @ ${first.odds}${slip.totalOdds ? ` — combined odds ${slip.totalOdds}` : ""}. Shared on GoalEdge.`,
    openGraph: {
      title,
      description: `Shared bet slip with ${slip.legs.length} leg${slip.legs.length === 1 ? "" : "s"}${slip.totalOdds ? ` at ${slip.totalOdds}` : ""}.`,
      type: "website",
    },
  };
}

export default async function SlipPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const slip = await getSlip(slug);

  if (!slip || slip.legs.length === 0) notFound();

  const copyText = slip.legs
    .map(
      (l, i) =>
        `${i + 1}. ${l.homeTeam} vs ${l.awayTeam} (${l.league}) — ${l.prediction} @ ${l.odds}`
    )
    .join("\n") + (slip.stake ? `\nStake: Ksh ${slip.stake.toLocaleString()}` : "");

  return (
    <main className="on-dark min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-md">
        {/* Brand */}
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-700 to-teal-700 text-sm">⚽</span>
            Goal<span className="text-emerald-400">Edge</span>
          </Link>
          <p className="mt-1 text-xs text-slate-400">Shared bet slip</p>
        </div>

        {/* Slip card */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="bg-gradient-to-r from-emerald-700 to-teal-700 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">Accumulator</p>
                <p className="text-lg font-extrabold">
                  {slip.legs.length} leg{slip.legs.length === 1 ? "" : "s"} · {slip.totalOdds?.toFixed(2)}x
                </p>
              </div>
              {slip.stake ? (
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">Potential return</p>
                  <p className="text-lg font-extrabold">Ksh {slip.potentialReturn?.toLocaleString() ?? "—"}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="divide-y divide-slate-800">
            {slip.legs.map((leg, i) => (
              <div key={i} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {leg.homeTeam} <span className="mx-1 text-xs font-medium text-slate-400">vs</span> {leg.awayTeam}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{leg.league} · {leg.matchTime}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-emerald-500/15 px-2 py-1 text-xs font-extrabold text-emerald-400 ring-1 ring-emerald-500/30">
                    {leg.odds}
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-semibold text-emerald-300">{leg.prediction}</p>
              </div>
            ))}
          </div>

          {slip.stake ? (
            <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3 text-sm">
              <span className="text-slate-400">Stake</span>
              <span className="font-bold">Ksh {slip.stake.toLocaleString()}</span>
            </div>
          ) : null}

          <div className="border-t border-slate-800 p-4">
            <CopySlipButton text={copyText} />
          </div>
        </div>

        <div className="mt-6 space-y-2 text-center">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 px-4 py-3 text-sm font-bold text-white transition hover:from-emerald-600 hover:to-teal-600"
          >
            Get today&apos;s tips on GoalEdge
          </Link>
          <p className="text-[10px] text-slate-400">
            18+ only · Play responsibly. Odds are indicative and may change.
          </p>
        </div>
      </div>
    </main>
  );
}
