import { Reveal } from "@/components/ui/reveal";
import type { Project } from "@/data/projects";

interface ProjectRolesProps {
  project: Project;
}

export function ProjectRoles({ project }: ProjectRolesProps) {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="project-roles-heading">
      <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(40,40,255,0.08),transparent_70%)]" />

      <div className="pointer-events-none absolute left-[15%] top-[20%] h-60 w-60 -translate-x-1/2 rounded-full bg-accent/10 blur-[125px]" />
      <div className="pointer-events-none absolute right-[20%] bottom-[20%] h-44 w-44 rounded-full bg-accent-400/8 blur-[100px]" />

      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Open roles
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="project-roles-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Roles we&apos;re looking for
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {project.roles.map((role, i) => (
            <Reveal key={role.id} delay={i * 60}>
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))]">
                <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative flex flex-1 flex-col p-6 sm:p-7">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08] text-sm font-semibold text-accent-400 transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:shadow-glow-sm">
                    {role.title.charAt(0)}
                  </div>

                  <h3 className="mt-5 text-[1rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                    {role.title}
                  </h3>
                  <p className="mt-2 flex-1 text-[0.88rem] leading-relaxed text-ink-400">
                    {role.description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
