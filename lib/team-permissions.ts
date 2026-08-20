/**
 * Every permission a team role can carry. This is the single source of truth
 * for permission identifiers — the DB validation list in
 * `00042_team_roles.sql` mirrors it, so any change here must be reflected
 * there too. Using an enum (never free-text strings) prevents typos like
 * `INVTE_MEMBERS` from silently breaking authorization.
 */
export enum TeamPermission {
  // Members
  INVITE_MEMBERS = "INVITE_MEMBERS",
  REVIEW_JOIN_REQUESTS = "REVIEW_JOIN_REQUESTS",
  REMOVE_MEMBERS = "REMOVE_MEMBERS",
  // Feed
  CREATE_FEED_POSTS = "CREATE_FEED_POSTS",
  EDIT_FEED_POSTS = "EDIT_FEED_POSTS",
  DELETE_FEED_POSTS = "DELETE_FEED_POSTS",
  // Projects
  CREATE_PROJECTS = "CREATE_PROJECTS",
  EDIT_PROJECTS = "EDIT_PROJECTS",
  ARCHIVE_PROJECTS = "ARCHIVE_PROJECTS",
  // Live sessions
  CREATE_LIVE_SESSIONS = "CREATE_LIVE_SESSIONS",
  MANAGE_LIVE_SESSIONS = "MANAGE_LIVE_SESSIONS",
  // Team settings
  EDIT_TEAM_INFORMATION = "EDIT_TEAM_INFORMATION",
  EDIT_TEAM_APPEARANCE = "EDIT_TEAM_APPEARANCE",
}

export const TEAM_PERMISSIONS: TeamPermission[] = Object.values(TeamPermission);

interface PermissionDefinition {
  permission: TeamPermission;
  label: string;
  description: string;
}

interface PermissionGroup {
  label: string;
  permissions: PermissionDefinition[];
}

/** Grouped permission catalog used to render the role-permission toggles. */
export const TEAM_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "Members",
    permissions: [
      { permission: TeamPermission.INVITE_MEMBERS, label: "Invite members", description: "Send invitations for people to join the team." },
      { permission: TeamPermission.REVIEW_JOIN_REQUESTS, label: "Review join requests", description: "Accept or decline requests to join the team." },
      { permission: TeamPermission.REMOVE_MEMBERS, label: "Remove members", description: "Remove members from the team." },
    ],
  },
  {
    label: "Feed",
    permissions: [
      { permission: TeamPermission.CREATE_FEED_POSTS, label: "Create feed posts", description: "Post updates to the team feed." },
      { permission: TeamPermission.EDIT_FEED_POSTS, label: "Edit feed posts", description: "Edit anyone's feed post in the team." },
      { permission: TeamPermission.DELETE_FEED_POSTS, label: "Delete feed posts", description: "Delete anyone's feed post in the team." },
    ],
  },
  {
    label: "Projects",
    permissions: [
      { permission: TeamPermission.CREATE_PROJECTS, label: "Create projects", description: "Create new projects under the team." },
      { permission: TeamPermission.EDIT_PROJECTS, label: "Edit projects", description: "Edit any project in the team." },
      { permission: TeamPermission.ARCHIVE_PROJECTS, label: "Archive projects", description: "Archive or remove projects in the team." },
    ],
  },
  {
    label: "Live sessions",
    permissions: [
      { permission: TeamPermission.CREATE_LIVE_SESSIONS, label: "Create live sessions", description: "Create live sessions hosted by the team." },
      { permission: TeamPermission.MANAGE_LIVE_SESSIONS, label: "Manage live sessions", description: "Edit or delete the team's live sessions." },
    ],
  },
  {
    label: "Team settings",
    permissions: [
      { permission: TeamPermission.EDIT_TEAM_INFORMATION, label: "Edit team information", description: "Update the team's name, description, and visibility." },
      { permission: TeamPermission.EDIT_TEAM_APPEARANCE, label: "Edit team appearance", description: "Change the team's logo and banner." },
    ],
  },
];