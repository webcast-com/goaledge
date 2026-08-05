"use client";

import { Star } from "lucide-react";

export function TestimonialCard({
  stars,
  quote,
  name,
  role,
  avatarColor,
  initial,
}: {
  stars: number;
  quote: string;
  name: string;
  role: string;
  avatarColor: string;
  initial: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/[0.06] dark:border-slate-700/60 dark:bg-slate-800/60 dark:hover:border-slate-600 dark:hover:bg-slate-800">
      {/* Decorative quote mark */}
      <span className="quote-decoration absolute -top-2 -right-2 text-8xl font-black leading-none text-emerald-500 select-none" aria-hidden="true">&ldquo;</span>
      <div className="relative">
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`star-animate h-4 w-4 ${
                i < stars
                  ? "fill-amber-400 text-amber-400"
                  : "fill-slate-200 text-slate-200 dark:fill-slate-600 dark:text-slate-600"
              }`}
            />
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          &ldquo;{quote}&rdquo;
        </p>
        <div className="mt-5 flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-white shadow-md"
            style={{ backgroundColor: avatarColor }}
          >
            {initial}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}