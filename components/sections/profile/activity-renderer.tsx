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
  Trash2,
  ShieldCheck,
  ShieldOff,
  Megaphone,
  CalendarDays,
  Sparkles,
  ArrowLeftRight,
  RotateCcw,
  FileText,
  Crown,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/date";

interface Activity {
  type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  creator_name?: string | null;
}

interface ActivityRendererProps {
  activity: Activity;
}

interface ActivityConfig {
  icon: LucideIcon;
  label: string;
  getDescription: (meta: Record<string, unknown>) => string;
  getAttribution?: (
    meta: Record<string, unknown>,
    creatorName?: string | null,
  ) => string | null;
  color: string;
}

const str = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value : fallback;

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
    getDescription: (meta) =>
      `Joined the ${str(meta.branch_name, str(meta.branch_id, "branch"))} branch`,
    color: "text-accent-400",
  },
  left_branch: {
    icon: LogOut,
    label: "Left Branch",
    getDescription: (meta) =>
      `Left the ${str(meta.branch_name, str(meta.branch_id, "branch"))} branch`,
    color: "text-ink-400",
  },
  created_team: {
    icon: Users,
    label: "Created Team",
    getDescription: (meta) =>
      `Created ${str(meta.team_name, str(meta.team_slug, "a team"))}`,
    color: "text-green-400",
  },
  joined_team: {
    icon: UserPlus,
    label: "Joined Team",
    getDescription: (meta) =>
      `Joined ${str(meta.team_name, str(meta.team_slug, "a team"))}`,
    color: "text-green-400",
  },
  left_team: {
    icon: UserMinus,
    label: "Left Team",
    getDescription: (meta) =>
      `Left ${str(meta.team_name, str(meta.team_slug, "a team"))}`,
    color: "text-ink-400",
  },
  created_project: {
    icon: Layers,
    label: "Created Project",
    getDescription: (meta) =>
      `Created ${str(meta.project_name, str(meta.project_slug, "a project"))}`,
    getAttribution: (meta, creatorName) => {
      const teamId = str(meta.team_id, "");
      const team = str(meta.team_name, "");
      if (teamId && team) return team;
      return creatorName ?? null;
    },
    color: "text-purple-400",
  },
  joined_project: {
    icon: UserPlus,
    label: "Joined Project",
    getDescription: (meta) =>
      `Joined ${str(meta.project_name, str(meta.project_slug, "a project"))}`,
    color: "text-purple-400",
  },
  left_project: {
    icon: LogOut,
    label: "Left Project",
    getDescription: (meta) =>
      `Left ${str(meta.project_name, str(meta.project_slug, "a project"))}`,
    color: "text-ink-400",
  },
  completed_project: {
    icon: Award,
    label: "Completed Project",
    getDescription: (meta) =>
      `Completed ${str(meta.project_name, str(meta.project_slug, "a project"))}`,
    color: "text-emerald-400",
  },
  deleted_project: {
    icon: Trash2,
    label: "Deleted Project",
    getDescription: (meta) =>
      `Deleted ${str(meta.project_name, str(meta.project_slug, "a project"))}`,
    color: "text-red-400",
  },
  restored_project: {
    icon: RotateCcw,
    label: "Restored Project",
    getDescription: (meta) =>
      `Restored ${str(meta.project_name, str(meta.project_slug, "a project"))}`,
    color: "text-emerald-400",
  },
  deleted_team: {
    icon: Trash2,
    label: "Deleted Team",
    getDescription: (meta) =>
      `Deleted ${str(meta.team_name, str(meta.team_slug, "a team"))}`,
    color: "text-red-400",
  },
  reactivated_team: {
    icon: RotateCcw,
    label: "Reactivated Team",
    getDescription: (meta) =>
      `Reactivated ${str(meta.team_name, str(meta.team_slug, "a team"))}`,
    color: "text-green-400",
  },
  requested_team_join: {
    icon: UserPlus,
    label: "Requested to Join Team",
    getDescription: (meta) =>
      `Requested to join ${str(meta.team_name, str(meta.team_slug, "a team"))}`,
    color: "text-accent-400",
  },
  invited_team_member: {
    icon: UserCheck,
    label: "Invited Member",
    getDescription: (meta) =>
      `Invited a member to ${str(meta.team_name, str(meta.team_slug, "a team"))}`,
    color: "text-accent-400",
  },
  updated_member_role: {
    icon: Crown,
    label: "Updated Member Role",
    getDescription: (meta) =>
      `Changed a member's role to ${str(meta.new_role, "a new role")} in ${str(
        meta.team_name,
        str(meta.team_slug, "the team")
      )}`,
    color: "text-accent-400",
  },
  removed_member: {
    icon: UserMinus,
    label: "Removed Member",
    getDescription: (meta) =>
      `Removed a member from ${str(meta.team_name, str(meta.team_slug, "the team"))}`,
    color: "text-red-400",
  },
  transferred_team_ownership: {
    icon: ArrowLeftRight,
    label: "Transferred Team Ownership",
    getDescription: (meta) =>
      `Transferred ownership of ${str(meta.team_name, str(meta.team_slug, "the team"))} to ${str(
        meta.new_owner_name,
        "another member"
      )}`,
    color: "text-accent-400",
  },
  transferred_project_ownership: {
    icon: ArrowLeftRight,
    label: "Transferred Project Ownership",
    getDescription: (meta) =>
      `Transferred ownership of ${str(
        meta.project_name,
        str(meta.project_slug, "the project")
      )} to ${str(meta.new_owner_name, "another member")}`,
    color: "text-accent-400",
  },
  created_team_update: {
    icon: FileText,
    label: "Posted Team Update",
    getDescription: (meta) =>
      `Posted an update in ${str(meta.team_name, str(meta.team_slug, "a team"))}`,
    color: "text-accent-400",
  },
  created_project_update: {
    icon: FileText,
    label: "Posted Project Update",
    getDescription: (meta) =>
      `Posted an update in ${str(meta.project_name, str(meta.project_slug, "a project"))}`,
    color: "text-accent-400",
  },
  created_branch: {
    icon: GitBranch,
    label: "Created Branch",
    getDescription: (meta) =>
      `Created the ${str(meta.branch_name, str(meta.branch_slug, str(meta.branch_id, "branch")))} branch`,
    color: "text-accent-400",
  },
  updated_branch: {
    icon: GitBranch,
    label: "Updated Branch",
    getDescription: (meta) =>
      `Updated the ${str(meta.branch_name, str(meta.branch_id, "branch"))} branch`,
    color: "text-accent-400",
  },
  deleted_branch: {
    icon: Trash2,
    label: "Deleted Branch",
    getDescription: (meta) =>
      `Deleted the ${str(meta.branch_name, str(meta.branch_id, "branch"))} branch`,
    color: "text-red-400",
  },
  created_branch_announcement: {
    icon: Megaphone,
    label: "Posted Announcement",
    getDescription: (meta) =>
      `Announced in the ${str(meta.branch_name, "branch")}`,
    color: "text-accent-400",
  },
  deleted_branch_announcement: {
    icon: Megaphone,
    label: "Deleted Announcement",
    getDescription: () => "Deleted an announcement",
    color: "text-ink-400",
  },
  created_branch_event: {
    icon: CalendarDays,
    label: "Created Event",
    getDescription: (meta) =>
      `Created "${str(meta.event_title, str(meta.event_id, "an event"))}" in ${str(
        meta.branch_name,
        "the branch"
      )}`,
    color: "text-accent-400",
  },
  deleted_branch_event: {
    icon: CalendarDays,
    label: "Deleted Event",
    getDescription: () => "Deleted an event",
    color: "text-ink-400",
  },
  created_branch_highlight: {
    icon: Sparkles,
    label: "Added Highlight",
    getDescription: (meta) =>
      `Added "${str(meta.highlight_title, str(meta.highlight_id, "a highlight"))}" in ${str(
        meta.branch_name,
        "the branch"
      )}`,
    color: "text-accent-400",
  },
  deleted_branch_highlight: {
    icon: Sparkles,
    label: "Removed Highlight",
    getDescription: () => "Removed a highlight",
    color: "text-ink-400",
  },
  assigned_branch_leader: {
    icon: ShieldCheck,
    label: "Assigned Branch Leader",
    getDescription: (meta) =>
      `Assigned ${str(meta.leader_username, "a member")} as leader of the ${str(
        meta.branch_name,
        "branch"
      )} branch`,
    color: "text-accent-400",
  },
  removed_branch_leader: {
    icon: ShieldOff,
    label: "Removed Branch Leader",
    getDescription: (meta) =>
      `Removed ${str(meta.leader_username, "a member")} as leader of the ${str(
        meta.branch_name,
        "branch"
      )} branch`,
    color: "text-red-400",
  },
  assigned_branch_manager: {
    icon: ShieldCheck,
    label: "Assigned Branch Manager",
    getDescription: (meta) =>
      `Assigned ${str(meta.manager_username, "a member")} as manager of the ${str(
        meta.branch_name,
        "branch"
      )} branch`,
    color: "text-accent-400",
  },
  removed_branch_manager: {
    icon: ShieldOff,
    label: "Removed Branch Manager",
    getDescription: (meta) =>
      `Removed ${str(meta.manager_username, "a member")} as manager of the ${str(
        meta.branch_name,
        "branch"
      )} branch`,
    color: "text-red-400",
  },
  won_event: {
    icon: Trophy,
    label: "Won Event",
    getDescription: (meta) =>
      `Won ${str(meta.event_name, str(meta.event_id, "an event"))}`,
    color: "text-yellow-400",
  },
};

export const SUPPORTED_ACTIVITY_TYPES = new Set(Object.keys(activityConfig));

export function ActivityRenderer({ activity }: ActivityRendererProps) {
  const config = activityConfig[activity.type];

  if (!config) {
    return null;
  }

  const Icon = config.icon;
  const attribution = config.getAttribution?.(
    activity.metadata,
    activity.creator_name,
  );

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
        {attribution ? (
          <p className="mt-0.5 text-sm text-ink-600">{`by ${attribution}`}</p>
        ) : null}
        <p className="mt-1 text-xs text-ink-600">
          {formatDistanceToNow(new Date(activity.created_at))}
        </p>
      </div>
    </div>
  );
}
