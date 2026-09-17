import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RequestSessionDialog } from "./request-session-dialog";
import { serverT } from "@/lib/translation/server";
import type { BranchOption } from "./request-session-dialog";

const TOPICS = [
  "academy.topicWorkshops",
  "academy.topicTalks",
  "academy.topicDeepDives",
  "academy.topicQa",
] as const;

export async function RequestSessionSection({
  branches,
  isAuthenticated,
}: {
  branches: BranchOption[];
  isAuthenticated: boolean;
}) {
  return (
    <section
      id="request-session"
      className="relative scroll-mt-24 py-16 sm:py-20 lg:py-24"
      aria-labelledby="request-session-heading"
    >
      <div className="mx-auto max-w-[720px] px-5 text-center sm:px-8">
        
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-normal text-accent-300">
            {await serverT("academy.requestEyebrow")}
          </span>
        

        
          <h2
            id="request-session-heading"
            className="mt-6 text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3rem] lg:text-[3.5rem]"
          >
            {await serverT("academy.requestH2")} {await serverT("academy.requestH2Accent")}
          </h2>
        

        
          <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
            {await serverT("academy.requestSub")}
          </p>
        

        
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {(await Promise.all(TOPICS.map(async (topic) => (
              <span
                key={topic}
                className="rounded-full bg-surface px-3.5 py-1.5 text-xs font-medium tracking-wide text-ink-200"
              >
                {await serverT(topic)}
              </span>
            ))))}
          </div>
        

        
          <div className="mt-10">
            {isAuthenticated ? (
              <RequestSessionDialog branches={branches} />
            ) : (
              <Button variant="secondary" size="lg" asChild>
                <Link href="/login">{await serverT("academy.requestSignIn")}</Link>
              </Button>
            )}
          </div>
        
      </div>
    </section>
  );
}
