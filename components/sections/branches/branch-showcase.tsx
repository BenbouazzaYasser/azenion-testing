import { Reveal } from "@/components/ui/reveal";
import type { Branch } from "@/data/branches";

import { BranchSpotlight } from "./branch-spotlight";

interface BranchShowcaseProps {
  branches: (Branch & { dbId?: string; memberCount: number })[];
  membershipBySlug: Record<string, boolean>;
}

export function BranchShowcase({ branches, membershipBySlug }: BranchShowcaseProps) {
  return (
    <section
      id="branches"
      aria-labelledby="branches-showcase-heading"
      className="relative px-6 py-24 sm:py-32"
    >
      <div className="pointer-events-none absolute left-[15%] top-[20%] h-80 w-80 -translate-x-1/2 rounded-full bg-accent/8 blur-[150px]" />
      <div className="pointer-events-none absolute right-[10%] bottom-[20%] h-60 w-60 rounded-full bg-accent-400/8 blur-[120px]" />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-[20%] top-[15%] h-[3px] w-[3px] rounded-full bg-accent-400/30" />
        <div className="absolute left-[75%] top-[25%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[15%] top-[70%] h-[2px] w-[2px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[80%] top-[75%] h-[3px] w-[3px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[45%] top-[8%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[90%] top-[40%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
        <div className="absolute left-[5%] top-[45%] h-[3px] w-[3px] rounded-full bg-accent-400/25" />
        <div className="absolute left-[60%] top-[90%] h-[2px] w-[2px] rounded-full bg-accent-400/20" />
      </div>

      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2
              id="branches-showcase-heading"
              className="text-3xl font-semibold text-white sm:text-4xl"
            >
              Meet the branches
            </h2>
            <p className="mt-4 text-white/55">
              Each branch runs its own events, mentorship, and build culture — all connected back
              to the same Limitless Network.
            </p>
          </div>
        </Reveal>

        <div className="flex flex-col gap-8 sm:gap-10">
          {branches.map((branch, index) => (
            <Reveal key={branch.slug} delay={index * 120}>
              <BranchSpotlight
                branch={branch}
                index={index}
                reversed={index % 2 === 1}
                isMember={membershipBySlug[branch.slug] ?? false}
                branchId={branch.dbId}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
