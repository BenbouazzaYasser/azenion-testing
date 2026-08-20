import type { LucideIcon } from "lucide-react";
import { Users, Layers, Rocket, Sparkles } from "lucide-react";

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const FEATURES: Feature[] = [
  {
    icon: Users,
    title: "Connect",
    description:
      "Join a global network of students, builders, and innovators from diverse institutions.",
  },
  {
    icon: Layers,
    title: "Collaborate",
    description:
      "Form teams, share ideas, and build projects that solve real problems together.",
  },
  {
    icon: Rocket,
    title: "Innovate",
    description:
      "Access resources, events, and opportunities that fuel your growth and ambition.",
  },
  {
    icon: Sparkles,
    title: "Elevate",
    description:
      "Showcase your work, celebrate milestones, and inspire the next generation of builders.",
  },
];
