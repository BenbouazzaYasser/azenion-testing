import type { BackgroundInfinityVariant } from "@/components/graphics/background-infinity";
import { AmbientBg } from "@/components/graphics/ambient-bg";
import { BackgroundAtmosphere } from "@/components/graphics/background-atmosphere";
import { BackgroundInfinity } from "@/components/graphics/background-infinity";

interface PageHeroProps {
  variant: BackgroundInfinityVariant;
  slug: string;
  children: React.ReactNode;
}

export function PageHero({ variant, slug, children }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden pt-[88px] sm:pt-[104px] lg:pt-[120px]">
      <AmbientBg />
      <BackgroundInfinity variant={variant} />
      <BackgroundAtmosphere />

      <div className="relative mx-auto max-w-[920px] px-5 pb-28 pt-20 text-center sm:px-8 sm:pt-24 lg:pb-40 lg:pt-32">
        {children}
      </div>

      <div className="absolute bottom-0 left-1/2 hidden h-px w-[600px] -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/30 to-transparent lg:block" />
    </section>
  );
}
