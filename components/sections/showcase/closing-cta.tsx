import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { DashboardButton } from "@/components/shared/dashboard-button";

export function ClosingCta() {
  return (
    <section className="relative py-24 sm:py-28 lg:py-32" aria-labelledby="closing-heading">
      <div className="relative mx-auto max-w-[720px] px-5 text-center sm:px-8">
        <Reveal>
          <h2
            id="closing-heading"
            className="text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3rem] lg:text-[3.5rem]"
          >
            Maybe <span className="text-accent-400">Your Project</span>{" "}
            Will Be the First.
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
            The first entry in this showcase has not been written yet. Join
            Azenion, start building, and help write the first chapter of our
            community&apos;s story.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/projects">
                Explore Projects
                <ArrowUpRight size={16} />
              </Link>
            </Button>
            <DashboardButton variant="secondary" size="lg" label="Join Azenion" showArrow={false} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
