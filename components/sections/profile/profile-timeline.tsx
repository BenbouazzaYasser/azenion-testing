import { Clock } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { ActivityRenderer } from "./activity-renderer";

interface Activity {
  id: string;
  type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ProfileTimelineProps {
  activities: Activity[];
  cardClass: string;
}

export function ProfileTimeline({ activities, cardClass }: ProfileTimelineProps) {
  return (
    <div className={cardClass}>
      <h2 className="text-sm font-medium uppercase tracking-wide text-ink-400">
        Activity
      </h2>

      {activities.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border-strong bg-white/[0.03] text-accent-300">
            <Clock className="h-6 w-6 text-accent-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink-200">No activity yet</p>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-ink-600">
              Joining a branch, creating a team, or shipping a project will
              show up here.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative mt-6 space-y-6 pl-6">
          <div className="absolute bottom-1 left-[4.5px] top-1 w-px bg-border/50" />
          {activities.map((activity, index) => (
            <Reveal key={activity.id} delay={index * 40}>
              <div className="relative">
                <span className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-accent shadow-glow-sm" />
                <ActivityRenderer activity={activity} />
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
