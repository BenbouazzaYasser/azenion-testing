import { FolderKanban } from "lucide-react";
import { ProjectCard, type ProjectCardProject } from "@/components/sections/projects/project-card";
import { serverT } from "@/lib/translation/server";

interface BranchPageProjectsProps {
  projects: ProjectCardProject[];
}

export async function BranchPageProjects({ projects }: BranchPageProjectsProps) {
  if (projects.length === 0) return null;

  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="branch-projects-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-normal text-accent-300">
            {await serverT("branches.buildsEyebrow")}
          </div>
        

        
          <h2
            id="branch-projects-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            {await serverT("branches.branchProjectsTitle")}
          </h2>
        

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>

        {projects.length >= 6 ? (
          
            <p className="mt-6 text-center text-xs text-ink-600">
              <FolderKanban size={12} className="mr-1 inline" />
              {await serverT("branches.showingProjectsSelection")}
            </p>
          
        ) : null}
      </div>
    </section>
  );
}
