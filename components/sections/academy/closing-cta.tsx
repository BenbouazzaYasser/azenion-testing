import Link from "next/link";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { DashboardButton } from "@/components/shared/dashboard-button";

export function AcademyClosingCta() {
  const t = useTranslations("academy.closing");

  return (
    <section className="relative py-24 sm:py-28 lg:py-32" aria-labelledby="academy-closing-heading">
      <div className="relative mx-auto max-w-[720px] px-5 text-center sm:px-8">
        <Reveal>
          <h2
            id="academy-closing-heading"
            className="text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3rem] lg:text-[3.5rem]"
          >
            {t("headingPlain")} <span className="text-accent-400">{t("headingAccent")}</span>
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
            {t("body")}
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <DashboardButton size="lg" label={t("joinAzenion")} />
            <Button variant="secondary" size="lg" asChild>
              <Link href="/branches">{t("exploreBranches")}</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
