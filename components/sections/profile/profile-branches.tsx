import Link from "next/link";
import { ArrowUpRight, Building2 } from "lucide-react";

interface UserBranch {
  name: string;
  slug: string;
  role: string;
}

interface ProfileBranchesProps {
  branches: UserBranch[];
  cardClass: string;
}

export function ProfileBranches({ branches, cardClass }: ProfileBranchesProps) {
  if (branches.length === 0) return null;

  return (
    <div className={cardClass}>
      <h2 className="text-sm font-medium uppercase tracking-wide text-ink-400">
        Branches
      </h2>

      <div className="mt-4 space-y-3">
        {branches.map((branch) => (
          <Link
            key={branch.slug}
            href={`/branches/${branch.slug}`}
            className="group flex items-center gap-3 rounded-xl bg-surface px-4 py-3 transition-all duration-300 hover:border-accent-400/40 hover:bg-accent/[0.04]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.75rem] border border-accent-400/30 bg-accent/[0.08] p-2">
              <Building2 size={16} className="text-accent-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-50 transition-colors group-hover:text-accent-400">
                {branch.name}
              </p>
              <p className="text-xs capitalize text-ink-500">{branch.role}</p>
            </div>
            <ArrowUpRight
              size={14}
              className="shrink-0 text-ink-600 transition-all duration-300 group-hover:text-accent-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
