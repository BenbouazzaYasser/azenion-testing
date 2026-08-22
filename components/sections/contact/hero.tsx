import { Sparkles } from "lucide-react";

import { PageHero } from "@/components/layout/page-hero";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";

export function ContactHero() {
  return (
    <PageHero variant="contact" slug="contact" atmosphere={false}>
      <Reveal delay={0}>
        <Badge className="inline-flex">
          <Sparkles size={13} className="text-accent-400" />
          Get in touch
        </Badge>
      </Reveal>

      <Reveal delay={80}>
        <h1
          id="contact-hero-heading"
          className="mt-6 text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]"
        >
          Let&apos;s Build Something{" "}
          <span className="text-accent-400">Limitless</span>{" "}
          Together
        </h1>
      </Reveal>

      <Reveal delay={160}>
        <p className="mx-auto mt-6 max-w-3xl text-balance text-[1.05rem] leading-relaxed text-ink-400 sm:text-[1.1rem] sm:leading-8">
          Whether you want to join the community, collaborate on a project, ask a
          question, or explore partnerships — we&apos;d love to hear from you.
          Every great connection starts with a single message.
        </p>
      </Reveal>

      <Reveal delay={240}>
        <div className="mt-8 hidden items-center justify-center gap-3 sm:flex">
          <span className="flex h-8 w-5 items-start justify-center rounded-full p-1.5">
            <span className="h-1.5 w-1.5 animate-scroll-dot rounded-full bg-accent-400" />
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-600">
            Scroll to explore
          </span>
        </div>
      </Reveal>
    </PageHero>
  );
}
