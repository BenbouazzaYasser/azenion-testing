"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Users, Rocket, ArrowDownWideNarrow } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { FilterBubbles } from "@/components/ui/filter-bubbles";
import { ProjectCard, type ProjectCardProject } from "./project-card";
import { filterAndSort, type SortKey, SORT_OPTIONS } from "@/lib/filter-sort";

interface AllProjectsProps {
  initialProjects: ProjectCardProject[];
  technologies: string[];
  categories: { id: string; name: string; slug: string }[];
}

export function AllProjects({ initialProjects, technologies, categories }: AllProjectsProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [techFilter, setTechFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  const filtered = useMemo(() => {
    let result = filterAndSort(initialProjects, {
      search,
      searchFields: [
        (p) => p.name,
        (p) => p.description ?? "",
        (p) => p.owner?.full_name ?? "",
        (p) => p.owner?.username ?? "",
        (p) => p.team?.name ?? "",
      ],
      sortKey: sort,
      sortDate: (p) => p.created_at,
      sortMembers: (p) => p.member_count,
      sortName: (p) => p.name,
    });

    if (techFilter.length > 0) {
      result = result.filter(
        (p) =>
          p.technologies &&
          p.technologies.some((t) =>
            techFilter.some((f) => t.toLowerCase() === f.toLowerCase())
          )
      );
    }

    if (categoryFilter.length > 0) {
      result = result.filter((p) =>
        categoryFilter.some((cid) =>
          (p.categories ?? []).some((c) => c.id === cid)
        )
      );
    }

    return result;
  }, [initialProjects, search, sort, techFilter, categoryFilter]);

  return (
    <section id="projects" className="relative scroll-mt-24 py-20 sm:py-24 lg:py-28" aria-labelledby="all-projects-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Projects
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="all-projects-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Explore projects
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-border-strong bg-white/[0.03] px-11 py-3 text-sm text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-white/[0.06] focus:shadow-input"
                />
              </div>

              <div className="flex items-center gap-2">
                <ArrowDownWideNarrow size={14} className="text-ink-500" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="appearance-none rounded-xl border border-border-strong bg-white/[0.03] px-3 py-3 pr-8 text-sm text-ink-50 outline-none transition-colors focus:border-accent-400/60 focus:bg-white/[0.06] focus:shadow-input"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#0c0c0f] text-ink-50">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {technologies.length > 0 ? (
              <FilterBubbles
                options={technologies.map((t) => ({ id: t, label: t }))}
                selected={techFilter}
                onSelect={(id) => {
                  if (id === "__clear") {
                    setTechFilter([]);
                  } else {
                    setTechFilter((prev) =>
                      prev.includes(id)
                        ? prev.filter((t) => t !== id)
                        : [...prev, id]
                    );
                  }
                }}
              />
            ) : null}

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
                        ? prev.filter((t) => t !== id)
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
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border-strong bg-white/[0.03] text-accent-300">
                <Rocket className="h-7 w-7 text-accent-300" />
              </div>
              <div>
                <p className="text-base font-medium text-ink-200">
                  {search || techFilter.length > 0 || categoryFilter.length > 0
                    ? "No projects match your filters"
                    : "No projects have been created yet"}
                </p>
                <p className="mt-1.5 text-sm text-ink-600">
                  {search || techFilter.length > 0 || categoryFilter.length > 0
                    ? "Try adjusting your search or filters."
                    : "Create the first project and start building the Azenion network."}
                </p>
              </div>
              {!search && techFilter.length === 0 && categoryFilter.length === 0 ? (
                <Button asChild variant="secondary" size="sm" className="mt-2">
                  <Link href="/projects/create">Create the first project</Link>
                </Button>
              ) : null}
            </div>
          </Reveal>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
