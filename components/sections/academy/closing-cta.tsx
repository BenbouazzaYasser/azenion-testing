import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { DashboardButton } from "@/components/shared/dashboard-button";
import { serverT } from "@/lib/translation/server";

export function AcademyClosingCta() {
  return (
    <section className="relative py-24 sm:py-28 lg:py-32" aria-labelledby="academy-closing-heading">
      <div className="relative mx-auto max-w-[720px] px-5 text-center sm:px-8">
        <Reveal>
          <h2
            id="academy-closing-heading"
            className="text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3rem] lg:text-[3.5rem]"
          >
            {serverT("academy.closingH2")} <span className="text-accent-400">{serverT("academy.closingH2Accent")}</span>
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
            {serverT("academy.closingSub")}
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <DashboardButton size="lg" label={serverT("academy.joinAzenion")} />
            <Button variant="secondary" size="lg" asChild>
              <Link href="/branches">{serverT("academy.exploreBranches")}</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
