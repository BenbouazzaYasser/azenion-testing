import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { announcements } from "@/data/announcements";

export function AnnouncementsFeed() {
  return (
    <section className="relative py-24 sm:py-28 lg:py-32" aria-labelledby="feed-heading">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.12),transparent_70%)]" />

      <div className="pointer-events-none absolute left-1/2 top-[15%] h-72 w-72 -translate-x-1/2 rounded-full bg-accent/10 blur-[140px]" />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-[15%] top-[20%] h-[3px] w-[3px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[78%] top-[15%] h-[2px] w-[2px] rounded-full bg-accent-400/15" />
        <div className="absolute left-[22%] top-[75%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[80%] top-[78%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[50%] top-[5%] h-[3px] w-[3px] rounded-full bg-accent-400/15" />
        <div className="absolute left-[90%] top-[50%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[5%] top-[45%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[60%] top-[90%] h-[2px] w-[2px] rounded-full bg-accent-400/15" />
      </div>

      <div className="mx-auto max-w-[720px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Latest
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="feed-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Announcements
          </h2>
        </Reveal>

        <div className="mt-12 flex flex-col gap-6">
          {announcements.map((announcement, i) => (
            <Reveal key={announcement.id} delay={i * 100}>
              <article className="group relative overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))]">
                <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

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
          ))}
        </div>
      </div>
    </section>
  );
}
