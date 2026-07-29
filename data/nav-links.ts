export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Branches", href: "/branches" },
  { label: "Teams", href: "/teams" },
  { label: "Projects", href: "/projects" },
  { label: "Showcase", href: "/showcase" },
  { label: "Announcements", href: "/announcements" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];
