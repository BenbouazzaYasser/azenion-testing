import Link from "next/link";
import { GraduationCap, Video, FlaskConical, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    icon: GraduationCap,
    title: "Courses",
    description:
      "Learn at your own pace through curated learning paths and community-created content.",
    href: "/academy/courses",
    action: "Explore Courses",
    badge: null,
    disabled: false,
  },
  {
    icon: Video,
    title: "Live Sessions",
    description:
      "Attend workshops, lectures and community-led sessions online or in person.",
    href: "/academy/live-sessions",
    action: "Explore Sessions",
    badge: null,
    disabled: false,
  },
  {
    icon: FlaskConical,
    title: "Labs",
    description:
      "Build, experiment, collaborate and innovate with other members in a shared space.",
    href: "/academy/labs",
    action: "Coming Soon",
    badge: "Coming Soon",
    disabled: true,
  },
] as const;

export function AcademyFeatures() {
  return (
    <section
      className="relative py-16 sm:py-20 lg:py-24"
      aria-labelledby="academy-features-heading"
    >
      <div className="mx-auto max-w-[1080px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
              Explore the Academy
            </span>
            <h2
              id="academy-features-heading"
              className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
            >
              Three ways to <span className="text-accent-400">level up.</span>
            </h2>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 120}>
              <article className="group flex h-full flex-col rounded-[2rem] border border-border-strong card-surface p-8 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent-400/25 bg-accent/[0.08] text-accent-300 shadow-[0_0_24px_-6px_rgba(109,109,255,0.5)]">
                    <feature.icon size={22} />
                  </span>
                  {feature.badge ? (
                    <Badge className="border-accent-400/30 bg-accent/[0.08] text-accent-300">
                      {feature.badge}
                    </Badge>
                  ) : null}
                </div>

                <h3 className="mt-6 text-xl font-semibold text-ink-50">
                  {feature.title}
                </h3>
                <p className="mt-2.5 flex-1 text-[0.95rem] leading-relaxed text-ink-400">
                  {feature.description}
                </p>

                <div className="mt-8">
                  {feature.disabled ? (
                    <Button variant="secondary" size="sm" disabled>
                      {feature.action}
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={feature.href}>
                        {feature.action}
                        <ArrowRight
                          size={14}
                          className="transition-transform duration-300 group-hover:translate-x-0.5"
                        />
                      </Link>
                    </Button>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
