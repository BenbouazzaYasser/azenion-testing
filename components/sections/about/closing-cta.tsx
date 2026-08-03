import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { DashboardButton } from "@/components/shared/dashboard-button";

export function ClosingCta() {
  return (
    <section className="relative py-24 sm:py-28 lg:py-32" aria-labelledby="cta-heading">
      <div className="relative mx-auto max-w-[720px] px-5 text-center sm:px-8">
        <Reveal>
          <h2
            id="cta-heading"
            className="text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3rem] lg:text-[3.5rem]"
          >
            The future{" "}
            <span className="text-accent-400">will not be built alone.</span>
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
            Whether you are a developer, designer, entrepreneur, or simply
            someone who refuses to settle for ordinary — there is a place
            for you here.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <DashboardButton size="lg" label="Join Azenion" />
            <Button variant="secondary" size="lg" asChild>
              <Link href="/projects">Explore Projects</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
