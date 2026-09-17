import { PageHero } from "@/components/layout/page-hero";
import { serverT } from "@/lib/translation/server";

export async function CreateTeamHero() {
  return (
    <PageHero variant="teams" slug="create-team" atmosphere={false}>
      
        <h1
          id="create-team-hero-heading"
          className="text-balance text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3.4rem] lg:text-[4rem]"
        >
          {await serverT("teams.createTitle")}
        </h1>
      

      
        <p className="mx-auto mt-6 max-w-3xl text-balance text-[1.05rem] leading-relaxed text-ink-400 sm:text-[1.1rem] sm:leading-8">
          {await serverT("teams.createSub")}
        </p>
      
    </PageHero>
  );
}
