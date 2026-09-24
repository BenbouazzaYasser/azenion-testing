// The same curve as public/logo.svg, treated as a drawn mark rather than a
// lighting effect: one quiet construction line and one signal line.
export const INFINITY_PATH =
  "M80 260C80 88 272 88 400 260C528 432 720 432 720 260C720 88 528 88 400 260C272 432 80 432 80 260Z";

export type InfinityVariant =
  | "hero"
  | "about"
  | "branches"
  | "teams"
  | "projects"
  | "showcase"
  | "announcements"
  | "academy"
  | "contact"
  | "login"
  | "join"
  | "team-detail"
  | "project-detail";

interface InfinityHeroArtProps {
  className?: string;
  /** Kept as page-level metadata for callers that use multiple variants. */
  idPrefix?: string;
  variant?: InfinityVariant;
}

export function InfinityHeroArt({ className, idPrefix = "hero", variant = "hero" }: InfinityHeroArtProps) {
  return (
    <svg
      viewBox="0 0 800 520"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      overflow="visible"
      className={className}
      data-mark-id={idPrefix}
      data-mark-variant={variant}
      aria-hidden="true"
    >
      <path
        d={INFINITY_PATH}
        stroke="#EAF0FF"
        strokeWidth="1"
        strokeLinecap="square"
        strokeLinejoin="miter"
        opacity="0.28"
        transform="translate(0 -14)"
        className="infinity-construction"
      />
      <path
        d={INFINITY_PATH}
        stroke="#2828FF"
        strokeWidth="3"
        strokeLinecap="square"
        strokeLinejoin="miter"
        pathLength={100}
        className="infinity-signal"
      />
    </svg>
  );
}
