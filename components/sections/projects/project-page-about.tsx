import { Globe, Github, Eye, Lock, Users } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { serverT } from "@/lib/translation/server";
import type { DictKey } from "@/lib/translation/types";

interface ProjectPageAboutProps {
  description: string;
  descriptionLong: string | null;
  website: string | null;
  githubUrl: string | null;
  technologies: string[];
  categories: { id: string; name: string; slug: string }[];
  team: { name: string; slug: string } | null;
  visibility: string;
}

const visibilityConfig: Record<string, { icon: typeof Eye; labelKey: DictKey; class: string }> = {
  open: { icon: Eye, labelKey: "projects.open", class: "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400" },
  invite_only: { icon: Lock, labelKey: "projects.inviteOnly", class: "border-amber-500/30 bg-amber-500/[0.08] text-amber-400" },
  private: { icon: Lock, labelKey: "projects.private", class: "border-rose-500/30 bg-rose-500/[0.08] text-rose-400" },
};

export async function ProjectPageAbout({ description, descriptionLong, website, githubUrl, technologies, categories, team, visibility }: ProjectPageAboutProps) {
  const displayText = descriptionLong || description;
  const paragraphs = displayText.split("\n").filter(Boolean);

  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="project-about-heading">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <div className="mx-auto max-w-[920px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            {await serverT("projects.aboutEyebrow")}
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="project-about-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            {await serverT("projects.aboutTitle")}
          </h2>
        </Reveal>

        <Reveal delay={160}>
          <div className="mt-6 space-y-5 text-[1.02rem] leading-8 text-ink-400">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </Reveal>

        {categories.length > 0 ? (
          <Reveal delay={180}>
            <div className="mt-6 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <span
                  key={cat.id}
                  className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/[0.06] px-3 py-1 text-[13px] font-medium text-blue-300"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          </Reveal>
        ) : null}

        {technologies.length > 0 ? (
          <Reveal delay={200}>
            <div className="mt-6 flex flex-wrap gap-2">
              {technologies.map((tech) => (
                <span
                  key={tech}
                  className="inline-flex items-center rounded-full border border-accent/20 bg-accent/[0.06] px-3 py-1 text-[13px] font-medium text-accent-300"
                >
                  {tech}
                </span>
              ))}
            </div>
          </Reveal>
        ) : null}

        {team || visibility ? (
          <Reveal delay={220}>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
              {team ? (
                <Link
                  href={`/teams/${team.slug}`}
                  className="inline-flex items-center gap-2 text-sm text-ink-400 transition-colors hover:text-accent-400"
                >
                  <Users size={14} />
                  {team.name}
                </Link>
              ) : null}
              {visibility ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-medium uppercase tracking-wider ${
                    visibilityConfig[visibility]?.class ?? "border-ink-700/50 bg-surface text-ink-400"
                  }`}
                >
                  {(() => {
                    const Icon = visibilityConfig[visibility]?.icon ?? Eye;
                    return <Icon size={12} />;
                  })()}
                  {visibilityConfig[visibility] ? await serverT(visibilityConfig[visibility].labelKey) : visibility}
                </span>
              ) : null}
            </div>
          </Reveal>
        ) : null}

        {website || githubUrl ? (
          <Reveal delay={260}>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
              {website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-accent-400 transition-colors hover:text-accent-300"
                >
                  <Globe size={14} />
                  {website.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
              {githubUrl ? (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-accent-400 transition-colors hover:text-accent-300"
                >
                  <Github size={14} />
                  {githubUrl.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
            </div>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
