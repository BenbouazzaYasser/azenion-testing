import { Reveal } from "@/components/ui/reveal";

const REASONS = [
  "struggle to find collaborators who share their ambition",
  "build in isolation when they could be building together",
  "miss opportunities simply because they never hear about them",
  "never meet the equally driven people right across their own campus",
];

export function OurStory() {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="story-heading">
      <div className="mx-auto max-w-[920px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="relative pl-8 sm:pl-14">
            <div className="absolute left-0 top-2 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-accent-400/40 via-accent-400/15 to-transparent" />
            <div className="absolute left-[-3px] top-2 h-[7px] w-[7px] rounded-full bg-accent-400 shadow-[0_0_10px_rgba(40,40,255,0.5)]" />

            <div className="max-w-[640px]">
              <h2
                id="story-heading"
                className="text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
              >
                Why Azenion exists
              </h2>

              <div className="mt-6 space-y-5 text-[1.02rem] leading-8 text-ink-400">
                <p>
                  Every great invention, every breakthrough, every movement
                  starts the same way: a person with an idea who refuses to let
                  it go. But between that first spark and something real, there
                  is a gap — and too many promising ideas never cross it.
                </p>
                <p>
                  The reason is rarely a lack of talent. It is the absence of
                  the right connections, the right collaborators, the right
                  environment. Students with world-changing potential spend
                  years working alone, unaware of the peers, mentors, and
                  opportunities just out of reach.
                </p>
              </div>
            </div>

            <div className="mt-12 space-y-6">
              {REASONS.map((reason, i) => (
                <div key={reason} className="relative pl-8 sm:pl-10">
                  <div className="absolute left-[-3px] top-[7px] h-[5px] w-[5px] rounded-full border border-accent-400/60 bg-void-950" />
                  {i < REASONS.length - 1 && (
                    <div className="absolute left-[-1px] top-[18px] h-[calc(100%+4px)] w-px bg-gradient-to-b from-accent-400/10 to-transparent" />
                  )}
                  <p className="text-[1rem] leading-relaxed text-ink-200 sm:text-[1.05rem]">
                    Students{" "}
                    <span className="text-accent-300/90">{reason}</span>.
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-12 max-w-[640px]">
              <p className="text-[1.02rem] leading-8 text-ink-400">
                Azenion exists to close that gap. We are building the
                infrastructure for ambition — a network where talent finds
                its people, ideas find their collaborators, and potential
                finds its path.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
