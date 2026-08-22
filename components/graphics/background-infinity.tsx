import { cn } from "@/lib/utils";
import { INFINITY_PATH } from "./infinity-hero-art";

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

const bgAnimation: Record<BackgroundInfinityVariant, string> = {
  about: "animate-drift-slow",
  branches: "animate-bg-infinity-reverse",
  teams: "animate-float-y",
  projects: "animate-bg-infinity-scale",
  showcase: "animate-bg-infinity-pulse",
  announcements: "",
  academy: "animate-drift-slow",
  community: "animate-bg-infinity-pulse",
  contact: "animate-drift-slow",
  login: "animate-float-y",
  join: "",
};

export function BackgroundInfinity({ variant, className }: BackgroundInfinityProps) {
  const anim = bgAnimation[variant];
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden",
        className
      )}
    >
      <div
        className={cn("h-[1600px] w-[1600px] opacity-[0.04] blur-[140px]", anim)}
        style={{ transformOrigin: "50% 50%" }}
      >
        <svg viewBox="0 0 800 520" className="h-full w-full" aria-hidden="true">
          <path
            d={INFINITY_PATH}
            fill="none"
            stroke="white"
            strokeWidth="3"
          />
        </svg>
      </div>
    </div>
  );
}
