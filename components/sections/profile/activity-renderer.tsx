import {
  Star,
  GitBranch,
  LogOut,
  Users,
  UserMinus,
  Layers,
  UserPlus,
  Award,
  Trophy,
  Circle,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/date";

interface Activity {
  type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ActivityRendererProps {
  activity: Activity;
}

interface ActivityConfig {
  icon: LucideIcon;
  label: string;
  getDescription: (meta: Record<string, unknown>) => string;
  color: string;
}

const activityConfig: Record<string, ActivityConfig> = {
  joined_azenion: {
    icon: Star,
    label: "Joined Azenion",
    getDescription: () => "Became part of The Limitless Network",
    color: "text-yellow-400",
  },
  joined_branch: {
    icon: GitBranch,
    label: "Joined Branch",
    getDescription: (meta) => `Joined the ${String(meta.branch_name ?? meta.branch_id ?? "")} branch`,
    color: "text-accent-400",
  },
  left_branch: {
    icon: LogOut,
    label: "Left Branch",
    getDescription: (meta) => `Left the ${String(meta.branch_name ?? meta.branch_id ?? "")} branch`,
    color: "text-ink-400",
  },
  created_team: {
    icon: Users,
    label: "Created Team",
    getDescription: (meta) => `Created ${String(meta.team_name ?? meta.team_slug ?? "a team")}`,
    color: "text-green-400",
  },
  joined_team: {
    icon: UserPlus,
    label: "Joined Team",
    getDescription: (meta) => `Joined ${String(meta.team_name ?? meta.team_slug ?? "a team")}`,
    color: "text-green-400",
  },
  left_team: {
    icon: UserMinus,
    label: "Left Team",
    getDescription: (meta) => `Left ${String(meta.team_name ?? meta.team_slug ?? "a team")}`,
    color: "text-ink-400",
  },
  created_project: {
    icon: Layers,
    label: "Created Project",
    getDescription: (meta) =>
      `Created ${String(meta.project_name ?? meta.project_slug ?? "a project")}`,
    color: "text-purple-400",
  },
  joined_project: {
    icon: UserPlus,
    label: "Joined Project",
    getDescription: (meta) =>
      `Joined ${String(meta.project_name ?? meta.project_slug ?? "a project")}`,
    color: "text-purple-400",
  },
  completed_project: {
    icon: Award,
    label: "Completed Project",
    getDescription: (meta) =>
      `Completed ${String(meta.project_name ?? meta.project_slug ?? "a project")}`,
    color: "text-emerald-400",
  },
  deleted_project: {
    icon: Trash2,
    label: "Deleted Project",
    getDescription: (meta) =>
      `Deleted ${String(meta.project_name ?? meta.project_slug ?? "a project")}`,
    color: "text-red-400",
  },
  won_event: {
    icon: Trophy,
    label: "Won Event",
    getDescription: (meta) => `Won ${String(meta.event_name ?? meta.event_id ?? "an event")}`,
    color: "text-yellow-400",
  },
};

const DEFAULT_CONFIG: ActivityConfig = {
  icon: Circle,
  label: "Activity",
  getDescription: () => "",
  color: "text-ink-400",
};

export function ActivityRenderer({ activity }: ActivityRendererProps) {
  const config = activityConfig[activity.type] ?? DEFAULT_CONFIG;
  const Icon = config.icon;

  return (
    <div className="flex flex-1 items-start gap-3">
      <div className={`mt-0.5 ${config.color}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-50">{config.label}</p>
        <p className="mt-0.5 text-sm text-ink-400">
          {config.getDescription(activity.metadata)}
        </p>
        <p className="mt-1 text-xs text-ink-600">
          {formatDistanceToNow(new Date(activity.created_at))}
        </p>
      </div>
    </div>
  );
}
