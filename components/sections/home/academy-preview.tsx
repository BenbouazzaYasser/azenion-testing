import { ArrowUpRight, GraduationCap } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { SessionCard } from "@/components/sections/academy/session-card";
import type { LiveSessionWithManage } from "@/lib/validations/live-session.schema";
import { serverT } from "@/lib/translation/server";

interface AcademyPreviewProps {
  sessions: LiveSessionWithManage[];
}

export async function AcademyPreview({ sessions }: AcademyPreviewProps) {
  const upcoming = sessions.filter((s) => s.status === "UPCOMING").slice(0, 3);

  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="academy-preview-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
                <GraduationCap size={13} />
                {await serverT("home.academyPreviewEyebrow")}
              </span>
              <h2
                id="academy-preview-heading"
                className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem] lg:text-[2.9rem]"
              >
                {await serverT("home.academyPreviewTitle")}<span className="text-accent-400">{await serverT("home.academyPreviewAccent")}</span>
              </h2>
              <p className="mt-5 text-[1.02rem] leading-relaxed text-ink-400">
                {await serverT("home.academyPreviewSub")}
              </p>
            </div>
            <Button asChild variant="ghost" className="shrink-0">
              <a href="/academy/live-sessions">
                {await serverT("home.exploreAcademy")}
                <ArrowUpRight size={16} />
              </a>
            </Button>
          </div>
        </Reveal>

        {upcoming.length > 0 ? (
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {upcoming.map((session, i) => (
              <Reveal key={session.id} delay={i * 100}>
                <SessionCard session={session} hostOptions={[]} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal>
            <div className="mt-14 flex flex-col items-center justify-center gap-3 rounded-[2rem] border border-dashed border-border-strong bg-white/[0.01] px-8 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-accent-400/30 bg-accent/[0.08] text-accent-300">
                <GraduationCap size={20} />
              </span>
              <p className="text-lg font-semibold text-ink-50">{await serverT("home.academyPreviewEmpty")}</p>
              <p className="max-w-md text-sm leading-relaxed text-ink-400">
                {await serverT("home.academyPreviewEmptySub")}
              </p>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
