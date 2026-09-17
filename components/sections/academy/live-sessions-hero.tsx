import { PageHero } from "@/components/layout/page-hero";
import { serverT } from "@/lib/translation/server";

export async function LiveSessionsHero() {
  return (
    <PageHero variant="academy" slug="academy" atmosphere={false}>
        <h1 className="text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]">
          {await serverT("academy.liveSessionsH1")}{" "}
          {await serverT("academy.liveSessionsH1Accent")}
        </h1>
      

      
        <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
          {await serverT("academy.liveSessionsSub")}
        </p>
      

      
        <div className="mt-8 hidden items-center justify-center gap-3 sm:flex">
          <span className="flex h-8 w-5 items-start justify-center rounded-full p-1.5">
            <span className="h-1.5 w-1.5 animate-scroll-dot rounded-full bg-accent-400" />
          </span>
          <span className="text-xs font-medium uppercase tracking-normal text-ink-600">
            {await serverT("academy.scrollToExplore")}
          </span>
        </div>
      
    </PageHero>
  );
}
