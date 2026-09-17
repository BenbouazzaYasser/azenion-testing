import { PageHero } from "@/components/layout/page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { serverT } from "@/lib/translation/server";

export async function LabsHero() {
  return (
    <PageHero variant="academy" slug="academy" atmosphere={false}>
      
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-normal text-accent-300">
          {await serverT("academy.labsEyebrow")}
        </span>
      

      
        <h1 className="mt-6 text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]">
          {await serverT("academy.labs")}
        </h1>
      

      
        <p className="mt-6 text-balance text-lg font-medium text-accent-300 sm:text-xl">
          {await serverT("academy.labsTagline")}
        </p>
      

      
        <div className="mt-6 flex justify-center">
          <Badge className="border-accent-400/30 bg-accent/[0.08] text-accent-300">
            {await serverT("academy.labsComingSoon")}
          </Badge>
        </div>
      

      
        <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
          {await serverT("academy.labsDesc")}
        </p>
      

      
        <div className="mt-8 flex flex-col items-center gap-4">
          <Button variant="secondary" size="lg" disabled>
            {await serverT("academy.labsNotify")}
          </Button>
          <p className="text-xs text-ink-600">
            {await serverT("academy.labsNotifySub")}
          </p>
        </div>
      
    </PageHero>
  );
}
