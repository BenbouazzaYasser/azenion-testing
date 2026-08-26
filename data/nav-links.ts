export interface NavLinkChild {
  label: string;
  href: string;
  description?: string;
}

export interface NavLink {
  label: string;
  href: string;
  children?: NavLinkChild[];
}

export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Teams", href: "/teams" },
  { label: "Projects", href: "/projects" },
  { label: "Branches", href: "/branches" },
  { label: "Servers", href: "/servers" },
  {
    label: "Community",
    href: "/community",
    children: [
      { label: "Feed", href: "/feed", description: "Updates across the network" },
      { label: "Showcase", href: "/showcase", description: "Community highlights" },
      { label: "Announcements", href: "/announcements", description: "Platform updates and milestones" },
    ],
  },
  { label: "Chat", href: "/chat" },
  {
    label: "Academy",
    href: "/academy",
    children: [
      { label: "Courses", href: "/academy/courses", description: "Self-paced learning paths" },
      { label: "Live Sessions", href: "/academy/live-sessions", description: "Workshops and lectures" },
      { label: "Labs", href: "/academy/labs", description: "Build and experiment" },
    ],
  },
];
