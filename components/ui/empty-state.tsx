"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  scrollToId?: string;
  eyebrow?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  scrollToId,
  eyebrow,
}: EmptyStateProps) {
  const handleScroll = () => {
    if (!scrollToId) return;
    const target = document.getElementById(scrollToId);
    if (!target) return;
    const top = target.getBoundingClientRect().top;
    const marginTop = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    if (Math.abs(top - marginTop) < 16) return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  };
  return (
    <section
      className="relative flex min-h-[60vh] w-full items-center justify-center overflow-hidden px-6 pb-16 pt-[120px] sm:pt-[136px] lg:pt-[152px]"
      aria-labelledby="empty-state-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="h-72 w-72 rounded-full bg-accent/10 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
        <Reveal>
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border-strong/[0.08] bg-surface text-accent-300 shadow-[0_0_40px_-12px_rgba(40,40,255,0.5)]">
            {icon}
          </div>
        </Reveal>

        {eyebrow ? (
          <Reveal delay={60}>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">
              {eyebrow}
            </p>
          </Reveal>
        ) : null}

        <Reveal delay={120}>
          <h1
            id="empty-state-heading"
            className="mt-4 text-balance text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl"
          >
            {title}
          </h1>
        </Reveal>

        <Reveal delay={200}>
          <p className="mt-6 max-w-xl text-balance text-base text-ink-400 sm:text-lg">
            {description}
          </p>
        </Reveal>

        <Reveal delay={300}>
          {actionHref ? (
            <Button asChild size="lg" className="mt-[35px] backdrop-blur-xl">
              <Link href={actionHref}>
                {actionLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <Button size="lg" className="mt-[35px] backdrop-blur-xl" onClick={handleScroll}>
              {actionLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </Reveal>
      </div>
    </section>
  );
}
