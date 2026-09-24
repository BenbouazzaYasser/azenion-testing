"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">

          <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-surface text-accent-300">
            {icon}
          </div>
        

        {eyebrow ? (
          
            <p className="mt-6 text-xs font-semibold uppercase tracking-normal text-ink-600">
              {eyebrow}
            </p>
          
        ) : null}

        
          <h1
            id="empty-state-heading"
            className="mt-4 text-balance text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl"
          >
            {title}
          </h1>
        

        
          <p className="mt-6 max-w-xl text-balance text-base text-ink-400 sm:text-lg">
            {description}
          </p>
        

        
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
        
      </div>
    </section>
  );
}
