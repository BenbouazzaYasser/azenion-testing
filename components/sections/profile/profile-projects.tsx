import Link from "next/link";
import { ArrowUpRight, FolderKanban, Users, Eye, Lock } from "lucide-react";

interface UserProject {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  role: string;
  visibility?: string;
  technologies?: string[];
  member_count?: number;
}

interface ProfileProjectsProps {
  projects: UserProject[];
  cardClass: string;
}

const visibilityLabels: Record<string, string> = {
  open: "Open",
  invite_only: "Invite only",
  private: "Private",
};

export function ProfileProjects({ projects, cardClass }: ProfileProjectsProps) {
  if (projects.length === 0) return null;

  return (
    <div className={cardClass}>
      <h2 className="text-sm font-medium uppercase tracking-wide text-ink-400">
        Projects
      </h2>

      <div className="mt-4 space-y-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.slug}`}
            className="group flex items-center gap-3 rounded-xl border border-border-strong/[0.08] bg-surface px-4 py-3 transition-all duration-300 hover:border-accent-400/40 hover:bg-accent/[0.04]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.75rem] border border-accent-400/30 bg-accent/[0.08] p-2">
              {project.logo_url ? (
                <img src={project.logo_url} alt="" className="h-full w-full rounded object-cover" />
              ) : (
                <FolderKanban size={16} className="text-accent-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-50 transition-colors group-hover:text-accent-400">
                {project.name}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-xs capitalize text-ink-500">
                  {project.role}
                </span>
                {project.visibility ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-border-strong/[0.08] bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-400">
                    {project.visibility === "private" ? <Lock size={8} /> : <Eye size={8} />}
                    {visibilityLabels[project.visibility] ?? project.visibility}
                  </span>
                ) : null}
                {project.member_count !== undefined ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-ink-500">
                    <Users size={10} className="text-accent-400" />
                    {project.member_count}
                  </span>
                ) : null}
              </div>
              {(project.technologies ?? []).length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(project.technologies ?? []).slice(0, 3).map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex rounded-full border border-accent/20 bg-accent/[0.06] px-2 py-0.5 text-[10px] font-medium text-accent-300"
                    >
                      {tech}
                    </span>
                  ))}
                  {(project.technologies ?? []).length > 3 ? (
                    <span className="inline-flex rounded-full border border-ink-700/50 bg-surface px-2 py-0.5 text-[10px] font-medium text-ink-500">
                      +{(project.technologies ?? []).length - 3}
                    </span>
                  ) : null}
                </div>
              ) : null}
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
