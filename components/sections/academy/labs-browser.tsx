"use client";

import { useMemo, useState } from "react";
import { Search, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";
import { FilterBubbles } from "@/components/ui/filter-bubbles";
import { LabCreateDialog } from "./lab-create-dialog";
import { LabCard } from "./lab-card";
import { LAB_CATEGORIES, LAB_DIFFICULTIES, LAB_TYPES, type LabRow } from "@/lib/validations/lab.schema";
import { labTypeMeta } from "./lab-type-meta";

const inputClass =
  "w-full rounded-full bg-surface px-4 py-3 text-sm text-ink-50 placeholder:text-ink-600 shadow-card outline-none backdrop-blur-xl transition-all duration-300 focus:border-accent-400/60 focus:bg-surface-hover focus:ring-2 focus:ring-accent-400/30";

interface LabsBrowserProps {
  labs: LabRow[];
  canCreate: boolean;
  isPlatformAdmin: boolean;
  currentUserId: string | null;
  availableCourses?: { id: string; title: string }[];
}

export function LabsBrowser({ labs, canCreate, isPlatformAdmin, currentUserId, availableCourses = [] }: LabsBrowserProps) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [category, setCategory] = useState("");

  const typeOptions = useMemo(
    () => LAB_TYPES.map((t) => ({ id: t, label: labTypeMeta(t).label })),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return labs.filter((lab) => {
      const matchesType = !type || lab.type === type;
      const matchesDifficulty = !difficulty || lab.difficulty === difficulty;
      const matchesCategory = !category || lab.category === category;
      const matchesQuery =
        !q ||
        lab.title.toLowerCase().includes(q) ||
        (lab.description ?? "").toLowerCase().includes(q) ||
        (lab.tags ?? []).some((tag) => tag.toLowerCase().includes(q));
      return matchesType && matchesDifficulty && matchesCategory && matchesQuery;
    });
  }, [labs, query, type, difficulty, category]);

  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="labs-browser-heading">
      <div className="mx-auto max-w-[1080px] px-5 sm:px-8">
        <Reveal>
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="relative w-full sm:max-w-sm">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search labs..."
                aria-label="Search labs"
                className={cn(inputClass, "pl-12")}
              />
            </div>
            {canCreate ? <LabCreateDialog /> : null}
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Type</span>
              <FilterBubbles options={typeOptions} selected={type} onSelect={setType} />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Difficulty</span>
              <FilterBubbles
                options={LAB_DIFFICULTIES.map((d) => ({ id: d, label: d.charAt(0).toUpperCase() + d.slice(1) }))}
                selected={difficulty}
                onSelect={setDifficulty}
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Category</span>
              <FilterBubbles options={LAB_CATEGORIES.map((c) => ({ id: c, label: c }))} selected={category} onSelect={setCategory} />
            </div>
          </div>
        </Reveal>

        <Reveal delay={160}>
          {filtered.length > 0 ? (
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((lab) => (
                <LabCard
                  key={lab.id}
                  lab={lab}
                  canManage={isPlatformAdmin || (currentUserId !== null && lab.created_by === currentUserId)}
                  availableCourses={availableCourses}
                />
              ))}
            </div>
          ) : (
            <div className="relative mt-14 overflow-hidden rounded-2xl card-surface-soft shadow-card backdrop-blur-xl">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(244,245,248,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,245,248,0.04)_1px,transparent_1px)] bg-[size:32px_32px]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]"
              />

              <div className="relative flex flex-col items-center px-8 py-20 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface text-accent-300 shadow-[0_0_40px_-12px_rgba(40,40,255,0.5)]">
                  <FlaskConical size={32} />
                </div>
                <h3 id="labs-browser-heading" className="mt-8 text-2xl font-semibold text-ink-50 sm:text-3xl">
                  {labs.length === 0 ? "No labs available yet" : "No labs match your search"}
                </h3>
                <p className="mt-4 max-w-md text-balance text-[0.95rem] leading-relaxed text-ink-400">
                  {labs.length === 0
                    ? "Practical labs are currently being prepared. Check back soon."
                    : "Try a different search term or filter."}
                </p>
                {labs.length === 0 ? (
                  <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-ink-600">Coming to Azenion Academy</p>
                ) : null}
              </div>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
