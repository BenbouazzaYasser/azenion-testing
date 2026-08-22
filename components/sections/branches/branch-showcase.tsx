"use client";

import { useMemo, useState } from "react";
import { Landmark, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";
import type { Branch } from "@/data/branches";

import { BranchSpotlight } from "./branch-spotlight";

interface BranchShowcaseProps {
  branches: (Branch & { dbId?: string; memberCount: number })[];
  membershipBySlug: Record<string, boolean>;
}

export function BranchShowcase({ branches, membershipBySlug }: BranchShowcaseProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((branch) =>
      [branch.name, branch.shortName, branch.city, branch.country, branch.tagline]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [branches, query]);

  return (
    <section
      id="branches"
      aria-labelledby="branches-showcase-heading"
      className="relative scroll-mt-24 px-6 py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2
              id="branches-showcase-heading"
              className="text-3xl font-semibold text-ink-50 sm:text-4xl"
            >
              Meet the branches
            </h2>
            <p className="mt-4 text-ink-400">
              Each branch runs its own events, mentorship, and build culture — all connected back
              to the same Limitless Network.
            </p>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="relative mx-auto mb-12 max-w-md">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search branches..."
              aria-label="Search branches"
              className={cn(
                "w-full rounded-full border border-border-strong/[0.08] bg-surface px-11 py-3 text-sm text-ink-50",
                "placeholder:text-ink-600 outline-none backdrop-blur-xl transition-colors",
                "focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-[0_0_0_1px_rgba(40,40,255,0.25)]",
              )}
            />
          </div>
        </Reveal>

        {filtered.length === 0 ? (
          <Reveal delay={160}>
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border-strong/[0.08] bg-surface text-accent-300">
                <Landmark className="h-7 w-7 text-accent-300" aria-hidden="true" />
              </div>
              <div>
                <p className="text-base font-medium text-ink-50">
                  {query.trim() ? "No branches match your search" : "No branches yet"}
                </p>
                <p className="mt-1.5 text-sm text-ink-500">
                  {query.trim()
                    ? "Try a different name or location."
                    : "Branches are being launched campus by campus. Check back soon."}
                </p>
              </div>
            </div>
          </Reveal>
        ) : (
          <div className="flex flex-col gap-6 sm:gap-8">
            {filtered.map((branch, index) => (
              <Reveal key={branch.slug} delay={index * 120}>
                <BranchSpotlight
                  branch={branch}
                  index={index}
                  reversed={index % 2 === 1}
                  isMember={membershipBySlug[branch.slug] ?? false}
                  branchId={branch.dbId}
                />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
