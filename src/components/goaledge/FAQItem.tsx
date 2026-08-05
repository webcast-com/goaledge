"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-xl border transition-all duration-300 ${open ? "border-emerald-200 bg-emerald-50/30 shadow-sm shadow-emerald-500/5 dark:border-emerald-800/60 dark:bg-emerald-950/20" : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700/60 dark:bg-slate-800/60 dark:hover:border-slate-600"}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors"
      >
        <span className="pr-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {question}
        </span>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${open ? "bg-emerald-100 text-emerald-600 rotate-180 dark:bg-emerald-900/50 dark:text-emerald-400" : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400"}`}>
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>
      <div className={`faq-answer-wrapper ${open ? "open" : ""}`}>
        <div className="faq-answer-inner">
          <div className="border-t border-slate-100 px-5 pb-4 pt-3 dark:border-slate-700">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}