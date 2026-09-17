"use client";

import { useMemo, useState } from "react";
import { Landmark, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Branch } from "@/data/branches";
import { useTranslation } from "@/components/translation/translation-provider";

import { BranchCreateDialog } from "./branch-create-dialog";
import { BranchDeleteDialog } from "./branch-delete-dialog";
import { BranchEditDialog } from "./branch-edit-dialog";
import { BranchSpotlight } from "./branch-spotlight";

interface BranchShowcaseProps {
  branches: (Branch & { dbId?: string; memberCount: number })[];
  membershipBySlug: Record<string, boolean>;
  /** Edit/delete access (core team, branch supervisors, platform admins). */
  canManage?: boolean;
  /** Create access (branch supervisors, platform admins). */
  canCreate?: boolean;
}

type ManageableBranch = Branch & { dbId: string; memberCount: number };

export function BranchShowcase({
  branches,
  membershipBySlug,
  canManage = false,
  canCreate = false,
}: BranchShowcaseProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [editingBranch, setEditingBranch] = useState<ManageableBranch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<ManageableBranch | null>(null);

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
        
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2
              id="branches-showcase-heading"
              className="text-3xl font-semibold text-ink-50 sm:text-4xl"
            >
              {t("branches.meetBranches")}
            </h2>
            <p className="mt-4 text-ink-400">
              {t("branches.showcaseSub")}
            </p>
          </div>
        

        
          <div className="relative mx-auto mb-12 flex max-w-md items-center gap-3">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("branches.searchBranches")}
                aria-label={t("branches.searchBranches")}
                className={cn(
                  "w-full rounded-full bg-surface px-11 py-3 text-sm text-ink-50",
                  "placeholder:text-ink-600 outline-none backdrop-blur-xl transition-colors",
                  "focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-[0_0_0_1px_rgba(40,40,255,0.25)]",
                )}
              />
            </div>
            {canCreate ? <BranchCreateDialog /> : null}
          </div>
        

        {filtered.length === 0 ? (
          
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-accent-300">
                <Landmark className="h-7 w-7 text-accent-300" aria-hidden="true" />
              </div>
              <div>
                <p className="text-base font-medium text-ink-50">
                  {query.trim() ? t("branches.noMatch") : t("branches.noneYet")}
                </p>
                <p className="mt-1.5 text-sm text-ink-500">
                  {query.trim()
                    ? t("branches.noMatchSub")
                    : t("branches.noneYetSub")}
                </p>
              </div>
            </div>
          
        ) : (
          <div className="flex flex-col gap-6 sm:gap-8">
            {filtered.map((branch, index) => (
              <BranchSpotlight
                key={branch.slug}
                  branch={branch}
                  index={index}
                  reversed={index % 2 === 1}
                  isMember={membershipBySlug[branch.slug] ?? false}
                  branchId={branch.dbId}
                  canManage={canManage}
                  onEdit={() => {
                    if (branch.dbId) setEditingBranch(branch as ManageableBranch);
                  }}
                  onDelete={() => {
                    if (branch.dbId) setDeletingBranch(branch as ManageableBranch);
                  }}
                />
              
            ))}
          </div>
        )}
      </div>

      {editingBranch ? (
        <BranchEditDialog branch={editingBranch} onClose={() => setEditingBranch(null)} />
      ) : null}
      {deletingBranch ? (
        <BranchDeleteDialog branch={deletingBranch} onClose={() => setDeletingBranch(null)} />
      ) : null}
    </section>
  );
}
