import { Sparkles } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { DashboardButton } from "@/components/shared/dashboard-button";
import { serverT } from "@/lib/translation/server";

export function About() {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="about-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <Reveal className="mx-auto max-w-5xl rounded-[2rem] card-surface-soft p-8 shadow-card backdrop-blur-xl sm:p-10 lg:p-14">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
                <Sparkles size={13} />
                {serverT("home.aboutEyebrow")}
              </div>

              <h2
                id="about-heading"
                className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem] lg:text-[2.9rem]"
              >
                {serverT("home.aboutTitle")}
              </h2>

              <p className="mt-5 max-w-2xl text-[1.02rem] leading-8 text-ink-400">
                {serverT("home.aboutParaA")}
              </p>

              <p className="mt-4 max-w-2xl text-[1.02rem] leading-8 text-ink-400">
                {serverT("home.aboutParaB")}
              </p>
            </div>

            <div className="flex flex-col justify-between rounded-[1.4rem] bg-void-950/70 p-6 sm:p-7">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.16em] text-ink-600">
                  {serverT("home.aboutWhyJoin")}
                </p>
                <ul className="mt-5 space-y-3 text-sm leading-7 text-ink-400">
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
                    {serverT("home.aboutWhyA")}
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
                    {serverT("home.aboutWhyB")}
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
                    {serverT("home.aboutWhyC")}
                  </li>
                </ul>
              </div>

              <DashboardButton size="lg" className="mt-6 w-full justify-center sm:w-auto" label={serverT("home.joinMovement")} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
