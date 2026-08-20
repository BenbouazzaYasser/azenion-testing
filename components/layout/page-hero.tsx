import type { BackgroundInfinityVariant } from "@/components/graphics/background-infinity";
import { AmbientBg } from "@/components/graphics/ambient-bg";
import { BackgroundAtmosphere } from "@/components/graphics/background-atmosphere";
import { BackgroundInfinity } from "@/components/graphics/background-infinity";

interface PageHeroProps {
  variant: BackgroundInfinityVariant;
  slug: string;
  atmosphere?: boolean;
  children: React.ReactNode;
}

export function PageHero({ variant, slug, atmosphere = true, children }: PageHeroProps) {
  return (
    <section
      className={`relative pt-[120px] sm:pt-[136px] lg:pt-[152px]${atmosphere ? " overflow-hidden" : ""}`}
    >
      {atmosphere ? <AmbientBg /> : null}
      <BackgroundInfinity variant={variant} />
      {atmosphere ? <BackgroundAtmosphere /> : null}

      <div className="relative mx-auto max-w-[920px] px-5 pb-16 pt-12 text-center sm:px-8 sm:pt-14 lg:pb-24 lg:pt-16">
        {children}
      </div>

      {atmosphere ? (
        <div className="absolute bottom-0 left-1/2 hidden h-px w-[600px] -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/30 to-transparent lg:block" />
      ) : null}
    </section>
  );
}
