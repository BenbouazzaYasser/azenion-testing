import { ArrowUpRight, Megaphone } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Announcement } from "@/data/announcements";

interface AnnouncementsPreviewProps {
  announcements: Announcement[];
}

export function AnnouncementsPreview({ announcements }: AnnouncementsPreviewProps) {
  const preview = announcements.slice(0, 3);

  return (
    <section
      className="relative py-20 sm:py-24 lg:py-28"
      aria-labelledby="announcements-preview-heading"
    >
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
                <Megaphone size={13} />
                Announcements
              </span>
              <h2
                id="announcements-preview-heading"
                className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem] lg:text-[2.9rem]"
              >
                The latest from <span className="text-accent-400">the network.</span>
              </h2>
              <p className="mt-5 text-[1.02rem] leading-relaxed text-ink-400">
                Platform updates, milestones and community news.
              </p>
            </div>
            <Button asChild variant="ghost" className="shrink-0">
              <a href="/announcements">
                All Announcements
                <ArrowUpRight size={16} />
              </a>
            </Button>
          </div>
        </Reveal>

        <div className="mt-14 flex flex-col gap-6">
          {preview.length > 0 ? (
            preview.map((announcement, i) => (
              <Reveal key={announcement.id} delay={i * 100}>
                <article className="group relative overflow-hidden rounded-[1.6rem] card-surface p-6 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm sm:p-7">
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[1.6rem] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex items-start gap-4">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08] text-lg transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:shadow-glow-sm"
                      aria-hidden="true"
                    >
                      {announcement.emoji}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[12px] font-medium uppercase tracking-[0.15em] text-accent-300">
                          {announcement.category}
                        </span>
                        {announcement.badge ? <Badge>{announcement.badge}</Badge> : null}
                      </div>

                      <h3 className="mt-1.5 text-[1.1rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400 sm:text-[1.2rem]">
                        {announcement.title}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-[0.92rem] leading-relaxed text-ink-400">
                        {announcement.description}
                      </p>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))
          ) : (
            <Reveal>
              <div className="flex flex-col items-center justify-center gap-3 rounded-[2rem] border border-dashed border-border-strong bg-white/[0.01] px-8 py-16 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-accent-400/30 bg-accent/[0.08] text-accent-300">
                  <Megaphone size={20} />
                </span>
                <p className="text-lg font-semibold text-ink-50">No announcements yet</p>
                <p className="max-w-md text-sm leading-relaxed text-ink-400">
                  New platform updates and community announcements will appear here.
                </p>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
