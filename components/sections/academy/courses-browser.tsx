"use client";

import { useState } from "react";
import { Search, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";
import { FilterBubbles } from "@/components/ui/filter-bubbles";

const CATEGORIES = [
  "Programming",
  "Engineering",
  "AI",
  "Mathematics",
  "Cybersecurity",
  "Design",
];

const inputClass =
  "w-full rounded-full border border-border-strong bg-white/[0.03] px-4 py-3 text-sm text-ink-50 placeholder:text-ink-600 shadow-card outline-none backdrop-blur-xl transition-all duration-300 focus:border-accent-400/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-accent-400/30";

export function CoursesBrowser() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  return (
    <section className="relative py-16 sm:py-20" aria-labelledby="courses-browser-heading">
      <div className="mx-auto max-w-[880px] px-5 sm:px-8">
        <Reveal>
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses..."
              aria-label="Search courses"
              className={cn(inputClass, "pl-12")}
            />
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-6 flex justify-center">
            <FilterBubbles
              options={CATEGORIES.map((c) => ({ id: c, label: c }))}
              selected={category}
              onSelect={setCategory}
            />
          </div>
        </Reveal>

        <Reveal delay={160}>
          <div className="relative mt-14 overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] shadow-card backdrop-blur-xl">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(244,245,248,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,245,248,0.04)_1px,transparent_1px)] bg-[size:32px_32px]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]"
            />

            <div className="relative flex flex-col items-center px-8 py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-accent-300 shadow-[0_0_40px_-12px_rgba(40,40,255,0.5)]">
                <GraduationCap size={32} />
              </div>
              <h3
                id="courses-browser-heading"
                className="mt-8 text-2xl font-semibold text-ink-50 sm:text-3xl"
              >
                No courses available yet
              </h3>
              <p className="mt-4 max-w-md text-balance text-[0.95rem] leading-relaxed text-ink-400">
                Courses are currently being prepared. Check back soon.
              </p>
              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-ink-600">
                Coming to Azenion Academy
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
