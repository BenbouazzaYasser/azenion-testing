"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Users, ArrowDownWideNarrow } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { FilterBubbles } from "@/components/ui/filter-bubbles";
import { TeamCard, type TeamCardTeam } from "./team-card";
import { filterAndSort, type SortKey, SORT_OPTIONS } from "@/lib/filter-sort";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface AllTeamsProps {
  initialTeams: TeamCardTeam[];
  categories: Category[];
}

export function AllTeams({ initialTeams, categories }: AllTeamsProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("newest");

  const filtered = useMemo(
    () =>
      filterAndSort(initialTeams, {
        search,
        searchFields: [
          (t) => t.name,
          (t) => t.description ?? "",
          (t) => (t.categories ?? []).map((c) => c.name).join(" "),
          (t) => t.owner?.full_name ?? "",
          (t) => t.owner?.username ?? "",
        ],
        sortKey: sort,
        sortDate: (t) => t.created_at,
        sortMembers: (t) => t.member_count,
        sortName: (t) => t.name,
        categoryFilter: categoryFilter.length > 0 ? categoryFilter : undefined,
        categoryIds: (t) => (t.categories ?? []).map((c) => c.id),
      }),
    [initialTeams, search, categoryFilter, sort]
  );

  return (
    <section id="teams" className="relative scroll-mt-24 py-20 sm:py-24 lg:py-28" aria-labelledby="all-teams-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Teams
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="all-teams-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Explore teams
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input
                  type="text"
                  placeholder="Search teams..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-border-strong bg-white/[0.03] px-11 py-3 text-sm text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_1px_rgba(109,109,255,0.15)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <ArrowDownWideNarrow size={14} className="text-ink-500" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="appearance-none rounded-xl border border-border-strong bg-white/[0.03] px-3 py-3 pr-8 text-sm text-ink-50 outline-none transition-colors focus:border-accent-400/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_1px_rgba(109,109,255,0.15)]"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#0c0c0f] text-ink-50">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {categories.length > 0 ? (
              <FilterBubbles
                options={categories.map((c) => ({ id: c.id, label: c.name }))}
                selected={categoryFilter}
                onSelect={(id) => {
                  if (id === "__clear") {
                    setCategoryFilter([]);
                  } else {
                    setCategoryFilter((prev) =>
                      prev.includes(id)
                        ? prev.filter((c) => c !== id)
                        : [...prev, id]
                    );
                  }
                }}
              />
            ) : null}
          </div>
        </Reveal>

        {filtered.length === 0 ? (
          <Reveal delay={160}>
            <div className="mt-10 flex flex-col items-center gap-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-ink-700/50 bg-white/[0.03]">
                <Users className="h-7 w-7 text-ink-500" />
              </div>
              <div>
                <p className="text-base font-medium text-ink-200">
                  {search || categoryFilter.length > 0
                    ? "No teams match your filters"
                    : "No teams have been created yet"}
                </p>
                <p className="mt-1.5 text-sm text-ink-500">
                  {search || categoryFilter.length > 0
                    ? "Try adjusting your search or filters."
                    : "Create the first team and start building the Azenion network."}
                </p>
              </div>
              {!search && categoryFilter.length === 0 ? (
                <Button asChild variant="secondary" size="sm" className="mt-2">
                  <Link href="/teams/create">Create the first team</Link>
                </Button>
              ) : null}
            </div>
          </Reveal>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((team, i) => (
              <TeamCard key={team.id} team={team} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
