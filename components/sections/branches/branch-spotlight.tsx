import Link from "next/link";
import { ArrowUpRight, Calendar, MapPin, Sparkles, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Branch } from "@/data/branches";

interface BranchSpotlightProps {
  branch: Branch;
  index: number;
  /** Flips the identity/detail columns on large screens for visual rhythm. */
  reversed?: boolean;
}

export function BranchSpotlight({ branch, index, reversed = false }: BranchSpotlightProps) {
  const order = String(index + 1).padStart(2, "0");

  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl transition-all duration-700 ease-premium hover:border-[rgba(40,40,255,0.4)] hover:bg-white/[0.04] sm:p-10 lg:p-12">
      {/* Background index numeral */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 -top-10 select-none text-[10rem] font-bold leading-none text-white/[0.03] sm:text-[13rem]"
      >
        {order}
      </span>

      {/* Hover glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-[rgb(40,40,255)]/0 blur-[100px] transition-all duration-700 ease-premium group-hover:bg-[rgb(40,40,255)]/20"
      />

      <div className="relative z-10 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Identity column */}
        <div className={`flex flex-col ${reversed ? "lg:order-2" : "lg:order-1"}`}>
          <div className="mb-6 flex items-center gap-4">
            <div className="animate-pulse-glow flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[rgba(40,40,255,0.35)] bg-[rgb(40,40,255)]/10 p-2.5">
              <svg viewBox="0 0 512 512" className="h-full w-full" aria-hidden="true">
                <defs>
                  <linearGradient id={"infinity-grad-".concat(branch.slug)} x1="106.74" y1="349.27" x2="405.26" y2="162.73" gradientUnits="userSpaceOnUse">
                    <stop offset="0.5" stopColor="#0033ff" stopOpacity="1" />
                    <stop offset="1" stopColor={branch.slug === "fsr" ? "#00007d" : "#00ff00"} stopOpacity="1" />
                  </linearGradient>
                </defs>
                <path d="M96 256C96 170 192 170 256 256C320 342 416 342 416 256C416 170 320 170 256 256C192 342 96 342 96 256Z" fill="none" stroke={"url(#infinity-grad-".concat(branch.slug, ")")} strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <Badge>Active branch</Badge>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-white/45">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {branch.city}, {branch.country}
              </div>
            </div>
          </div>

          <h3 className="text-2xl font-semibold text-white sm:text-3xl">{branch.shortName}</h3>
          <p className="mt-1 text-sm text-white/50">{branch.name}</p>
          <p className="mt-5 text-sm leading-relaxed text-white/60 sm:text-base">
            {branch.description}
          </p>

          <div className="mt-8 flex items-center gap-6 border-t border-white/10 pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[rgb(40,40,255)]" aria-hidden="true" />
              <span className="text-sm text-white/70">{branch.memberCount} Member{branch.memberCount !== 1 ? 's' : ''}</span>
            </div>
            {branch.founded ? (
              <div className="text-sm text-white/40">Since {branch.founded}</div>
            ) : null}
          </div>

          <div className="mt-8">
            <Button asChild variant="primary">
              <Link href={branch.joinCta.href}>
                {branch.joinCta.label}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            {branch.joinCta.helperText ? (
              <p className="mt-3 text-xs text-white/35">{branch.joinCta.helperText}</p>
            ) : null}
          </div>
        </div>

        {/* Detail column */}
        <div className={`flex flex-col gap-6 ${reversed ? "lg:order-1" : "lg:order-2"}`}>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-white/45">
              <Calendar className="h-3.5 w-3.5 text-[rgb(40,40,255)]" aria-hidden="true" />
              Upcoming events
            </div>
            <ul className="flex flex-col gap-3">
              {branch.upcomingEvents.map((event) => (
                <li key={event.id}>
                  <p className="text-sm font-medium text-white/85">{event.title}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-white/45">
              <Sparkles className="h-3.5 w-3.5 text-[rgb(40,40,255)]" aria-hidden="true" />
              Branch highlights
            </div>
            <ul className="flex flex-col gap-3">
              {branch.highlights.map((highlight) => (
                <li key={highlight.id} className="text-sm text-white/65">
                  <span className="font-medium text-white/85">{highlight.label}.</span>{" "}
                  {highlight.description}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </article>
  );
}
