import Link from "next/link";
import { ArrowUpRight, Compass } from "lucide-react";

import { PageHero } from "@/components/layout/page-hero";
import { Button } from "@/components/ui/button";

export function CommunityHero() {
  return (
    <PageHero variant="community" slug="community" atmosphere={false}>
      
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-normal text-accent-300">
          <Compass size={13} />
          The Community Hub
        </span>
      

      
        <h1 className="mt-6 text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]">
          Everything happening{" "}
          across the network.
        </h1>
      

      
        <p className="mx-auto mt-6 max-w-3xl text-balance text-[1.05rem] leading-relaxed text-ink-400 sm:text-[1.1rem] sm:leading-8">
          The feed, the showcase, announcements, teams, projects and live
          sessions — the pulse of the Limitless Network, all in one place.
        </p>
      

      
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/feed">
              Explore Feed
              <ArrowUpRight size={16} />
            </Link>
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <Link href="/showcase">
              Discover Showcase
              <ArrowUpRight size={16} />
            </Link>
          </Button>
        </div>
      

      
        <div className="mt-8 hidden items-center justify-center gap-3 sm:flex">
          <span className="flex h-8 w-5 items-start justify-center rounded-full p-1.5">
            <span className="h-1.5 w-1.5 animate-scroll-dot rounded-full bg-accent-400" />
          </span>
          <span className="text-xs font-medium uppercase tracking-normal text-ink-600">
            Scroll to explore
          </span>
        </div>
      
    </PageHero>
  );
}
