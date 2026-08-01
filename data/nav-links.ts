export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Teams", href: "/teams" },
  { label: "Projects", href: "/projects" },
  { label: "Branches", href: "/branches" },
  { label: "Feed", href: "/feed" },
  { label: "Chat", href: "/chat" },
  { label: "Announcements", href: "/announcements" },
];
