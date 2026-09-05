import { Reveal } from "@/components/ui/reveal";
import { serverT } from "@/lib/translation/server";
import {
  ActivityRenderer,
  SUPPORTED_ACTIVITY_TYPES,
} from "@/components/sections/profile/activity-renderer";

interface ActivityData {
  type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  creator_name?: string;
}

interface ProjectPageActivityProps {
  activities: ActivityData[];
}

export async function ProjectPageActivity({ activities }: ProjectPageActivityProps) {
  const supportedActivities = activities.filter((activity) =>
    SUPPORTED_ACTIVITY_TYPES.has(activity.type),
  );

  if (supportedActivities.length === 0) return null;

  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="project-activity-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            {await serverT("projects.activityEyebrow")}
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="project-activity-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            {await serverT("projects.activityTitle")}
          </h2>
        </Reveal>

        <div className="mt-10 space-y-5">
          {supportedActivities.map((activity, i) => (
            <Reveal key={`${activity.type}-${activity.created_at}-${i}`} delay={i * 60}>
              <div className="group relative overflow-hidden rounded-2xl card-surface p-5 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-0.5 hover:border-accent-400/40 hover:shadow-glow-sm">
                <ActivityRenderer activity={activity} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
