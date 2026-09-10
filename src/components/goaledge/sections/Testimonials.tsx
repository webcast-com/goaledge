"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "@/components/goaledge/animations";
import { Star } from "lucide-react";
import { TestimonialCard } from "../TestimonialCard";

export function Testimonials() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 dark:bg-slate-900/70">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
              <Star className="h-3.5 w-3.5" /> Community love
            </span>
            <h2 className="section-heading mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Loved by football fans
            </h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400">
              Join thousands of fans using GoalEdge to find value every
              matchday.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" staggerDelay={0.12}>
          {[
            {
              stars: 5,
              quote:
                "The accumulator slips alone pay for themselves. Best KSH 100 I spend each week.",
              name: "Tunde B.",
              role: "Premium member",
              avatarColor: "rgb(16, 185, 129)",
              initial: "T",
            },
            {
              stars: 5,
              quote:
                "Even the free tips are sharper than most paid services I've tried. Clean dashboard too.",
              name: "Grace M.",
              role: "Free member",
              avatarColor: "rgb(14, 165, 233)",
              initial: "G",
            },
            {
              stars: 5,
              quote:
                "The in-depth analysis actually teaches you how to think about matches. Game changer.",
              name: "Samuel O.",
              role: "Premium member",
              avatarColor: "rgb(245, 158, 11)",
              initial: "S",
            },
            {
              stars: 4,
              quote:
                "The free tier is generous. I started winning consistently before even considering premium.",
              name: "Amina K.",
              role: "Free member",
              avatarColor: "rgb(139, 92, 246)",
              initial: "A",
            },
            {
              stars: 5,
              quote:
                "GoalEdge's NPFL coverage is unmatched. Finally, someone takes African football seriously.",
              name: "Chidi N.",
              role: "Premium member",
              avatarColor: "rgb(236, 72, 153)",
              initial: "C",
            },
          ].map((t) => (
            <StaggerItem key={t.name}>
              <TestimonialCard {...t} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}