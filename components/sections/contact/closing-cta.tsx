import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";

export function ContactCta() {
  return (
    <section
      aria-labelledby="contact-cta-heading"
      className="relative overflow-hidden py-28 sm:py-32 lg:py-40"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(40,40,255,0.18),transparent_50%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/8 blur-[140px]" />

      <div className="relative mx-auto max-w-[720px] px-5 text-center sm:px-8">
        <Reveal>
          <h2
            id="contact-cta-heading"
            className="text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3rem] lg:text-[3.5rem]"
          >
            The next great idea starts <span className="text-accent-400">with a conversation.</span>
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
            Whether you&apos;re ready to join, curious to learn more, or have an idea
            you&apos;d like to share — we&apos;d love to meet you.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/join">
                Join Azenion
                <ArrowUpRight size={16} />
              </Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/about">Learn More</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
