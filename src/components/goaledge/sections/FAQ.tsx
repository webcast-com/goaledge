"use client";

import { FadeIn } from "@/components/goaledge/animations";
import { FAQItem } from "../FAQItem";
import { faqs } from "@/lib/faq-data";

export function FAQ() {
  return (
    <section id="faq" className="scroll-mt-16 mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <FadeIn>
        <div className="text-center">
          <h2 className="section-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400">
            Got questions? We&apos;ve got answers.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.15}>
        <div className="mt-10 space-y-3">
          {faqs.map((faq, i) => (
            <FAQItem key={i} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </FadeIn>
    </section>
  );
}