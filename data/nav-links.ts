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
  { label: "Feed", href: "/feed" },
  { label: "Chat", href: "/chat" },
  { label: "Announcements", href: "/announcements" },
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
