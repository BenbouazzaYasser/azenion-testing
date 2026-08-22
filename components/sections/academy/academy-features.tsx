import Link from "next/link";
import { GraduationCap, Video, FlaskConical, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    icon: GraduationCap,
    key: "courses",
    href: "/academy/courses",
    badge: false,
    disabled: false,
  },
  {
    icon: Video,
    key: "liveSessions",
    href: "/academy/live-sessions",
    badge: false,
    disabled: false,
  },
  {
    icon: FlaskConical,
    key: "labs",
    href: "/academy/labs",
    badge: true,
    disabled: true,
  },
] as const;

export function AcademyFeatures() {
  const t = useTranslations("academy.features");

  return (
    <section
      className="relative py-16 sm:py-20 lg:py-24"
      aria-labelledby="academy-features-heading"
    >
      <div className="mx-auto max-w-[1080px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
              {t("eyebrow")}
            </span>
            <h2
              id="academy-features-heading"
              className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
            >
              {t("headingPlain")} <span className="text-accent-400">{t("headingAccent")}</span>
            </h2>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.key} delay={i * 120}>
              <article className="group flex h-full flex-col rounded-[2rem] border border-border-strong card-surface p-8 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-accent-400/40 hover:shadow-glow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent-400/25 bg-accent/[0.08] text-accent-300 shadow-[0_0_24px_-6px_rgba(109,109,255,0.5)]">
                    <feature.icon size={22} />
                  </span>
                  {feature.badge ? (
                    <Badge className="border-accent-400/30 bg-accent/[0.08] text-accent-300">
                      {t(`${feature.key}.badge`)}
                    </Badge>
                  ) : null}
                </div>

                <h3 className="mt-6 text-xl font-semibold text-ink-50">
                  {t(`${feature.key}.title`)}
                </h3>
                <p className="mt-2.5 flex-1 text-[0.95rem] leading-relaxed text-ink-400">
                  {t(`${feature.key}.description`)}
                </p>

                <div className="mt-8">
                  {feature.disabled ? (
                    <Button variant="secondary" size="sm" disabled>
                      {t(`${feature.key}.action`)}
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={feature.href}>
                        {t(`${feature.key}.action`)}
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
