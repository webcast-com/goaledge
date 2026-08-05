"use client";

import { ReactNode } from "react";

export function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="feature-card group rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition-all duration-300 hover:border-emerald-200 hover:bg-white hover:shadow-lg hover:shadow-emerald-900/[0.04] dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-emerald-600 dark:hover:bg-slate-800">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-all duration-300 group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-500/30 dark:bg-emerald-900/40 dark:text-emerald-400 dark:group-hover:bg-emerald-500 dark:group-hover:text-white">
        {icon}
      </span>
      <h3 className="mt-4 font-bold text-slate-900 dark:text-slate-50">
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}