"use client";

import { FadeIn } from "@/components/goaledge/animations";
import {
  Crown,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Users,
} from "lucide-react";

export interface CTAProps {
  onSetAuthMode: (m: "signin" | "signup") => void;
  onSetAuthOpen: (open: boolean) => void;
}

export function CTA({ onSetAuthMode, onSetAuthOpen }: CTAProps) {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <FadeIn>
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl px-6 py-16 text-center text-white sm:px-12 sm:py-20">
          {/* Animated gradient border */}
          <div className="cta-gradient absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600" />
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 opacity-95" />
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 opacity-40 blur-md" aria-hidden="true" />
          
          {/* Subtle CSS grid pattern overlay */}
          <div className="absolute inset-0 rounded-3xl opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '24px 24px' }} aria-hidden="true" />

          {/* Decorative floating elements */}
          <div className="cta-float-1 absolute top-8 left-8 h-16 w-16 rounded-full bg-white/10 blur-sm" aria-hidden="true" />
          <div className="cta-float-2 absolute bottom-8 right-12 h-24 w-24 rounded-full bg-white/5 blur-md" aria-hidden="true" />
          <div className="cta-float-1 absolute right-1/4 top-12 h-8 w-8 rounded-full bg-white/10" aria-hidden="true" style={{ animationDelay: '-3s' }} />
          
          {/* Additional floating decorative dots */}
          <div className="absolute bottom-16 left-1/4 h-5 w-5 rounded-full bg-white/10 blur-sm" aria-hidden="true" />
          <div className="absolute top-1/3 right-16 h-3 w-3 rounded-full bg-white/15 blur-[2px]" aria-hidden="true" />
          <div className="absolute bottom-1/3 left-16 h-4 w-4 rounded-full bg-white/8 blur-sm" aria-hidden="true" />
          
          <div className="relative">
            <Crown className="mx-auto h-10 w-10 text-emerald-200" />
            <h2 className="mt-5 text-3xl font-bold sm:text-4xl">
              Ready to take your predictions
              <br className="hidden sm:block" /> to the next level?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-emerald-100">
              Join 2,841+ fans using GoalEdge to find value every matchday. Average member profit: Ksh 4,200/month.
            </p>
            
            {/* Trust metrics */}
            <div className="mx-auto mt-6 flex max-w-md flex-wrap items-center justify-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm ring-1 ring-white/20">
                <CheckCircle2 className="h-3.5 w-3.5" /> 53.2% win rate
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm ring-1 ring-white/20">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure payments
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm ring-1 ring-white/20">
                <Users className="h-3.5 w-3.5" /> 2,841+ users
              </span>
            </div>
            
            <button
              onClick={() => { onSetAuthMode("signup"); onSetAuthOpen(true); }}
              className="group mt-8 inline-flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-white px-8 text-lg font-bold text-emerald-700 shadow-xl shadow-black/20 transition-all hover:bg-emerald-50 hover:shadow-2xl hover:-translate-y-1 active:translate-y-0"
            >
              Create your free account
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1.5" />
            </button>
            <p className="mt-3 text-xs text-emerald-200">
              No credit card required · Free forever plan
            </p>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}