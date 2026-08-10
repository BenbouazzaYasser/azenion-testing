import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { AnnouncementFormDialog } from "@/components/sections/announcements/announcement-dialog";
import { DeleteAnnouncementButton } from "@/components/sections/announcements/delete-announcement-button";
import type { Announcement } from "@/data/announcements";

interface AnnouncementsFeedProps {
  announcements: Announcement[];
  canManage: boolean;
}

export function AnnouncementsFeed({ announcements, canManage }: AnnouncementsFeedProps) {
  return (
    <section className="relative py-14 sm:py-16" aria-labelledby="feed-heading">
      <div className="mx-auto max-w-[720px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Latest
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <h2
              id="feed-heading"
              className="text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
            >
              Announcements
            </h2>
            {canManage ? <AnnouncementFormDialog mode="create" /> : null}
          </div>
        </Reveal>

        <div className="mt-10 flex flex-col gap-6">
          {announcements.length === 0 ? (
            <Reveal>
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-border-strong card-surface px-8 py-16 text-center shadow-card backdrop-blur-xl">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border-strong bg-surface text-accent-300">
                  <Megaphone className="h-7 w-7 text-accent-300" />
                </div>
                <p className="text-base font-medium text-ink-200">No announcements yet</p>
                <p className="max-w-sm text-sm leading-relaxed text-ink-600">
                  {canManage
                    ? "Publish the first announcement to keep the community informed."
                    : "New platform updates and community announcements will appear here."}
                </p>
                {canManage ? <AnnouncementFormDialog mode="create" /> : null}
              </div>
            </Reveal>
          ) : (
            announcements.map((announcement, i) => (
              <Reveal key={announcement.id} delay={i * 100}>
                <article className="group relative overflow-hidden rounded-2xl border border-border-strong card-surface shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm">
                  <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  {canManage ? (
                    <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                      <AnnouncementFormDialog mode="edit" announcement={announcement} />
                      <DeleteAnnouncementButton id={announcement.id} />
                    </div>
                  ) : null}

                  <div className="relative p-6 sm:p-8">
                    <div className="flex items-start gap-5">
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/[0.08] text-lg transition-all duration-500 ease-premium group-hover:-translate-y-1 group-hover:scale-[1.05] group-hover:shadow-glow-sm"
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

                        <h3 className="mt-2 text-[1.2rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400 sm:text-[1.35rem]">
                          {announcement.title}
                        </h3>

                        <p className="mt-3 text-[0.92rem] leading-relaxed text-ink-400">
                          {announcement.description}
                        </p>

                        {announcement.details ? (
                          <ul className="mt-4 space-y-1.5">
                            {announcement.details.map((detail) => (
                              <li
                                key={detail}
                                className="flex items-center gap-2 text-[0.92rem] text-ink-400"
                              >
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
                                {detail}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
