export type BackgroundInfinityVariant =
  | "about"
  | "branches"
  | "teams"
  | "projects"
  | "showcase"
  | "announcements"
  | "academy"
  | "community"
  | "contact"
  | "login"
  | "join";

interface BackgroundInfinityProps {
  variant: BackgroundInfinityVariant;
  className?: string;
}

export function BackgroundInfinity({}: BackgroundInfinityProps) {
  return null;
}