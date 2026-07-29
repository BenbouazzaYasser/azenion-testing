import type { LucideIcon } from "lucide-react";
import {
  Users,
  Code,
  Rocket,
  Search,
  Lightbulb,
  Award,
  Heart,
  BookOpen,
  GitBranch,
  Layers,
  Calendar,
  Sparkles,
  TrendingUp,
  Palette,
  Cpu,
  Briefcase,
  GraduationCap,
  Pen,
} from "lucide-react";

export interface MissionCard {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface CoreValue {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface Role {
  icon: LucideIcon;
  title: string;
}

export interface EcosystemItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const MISSION_CARDS: MissionCard[] = [
  {
    icon: Users,
    title: "Connect",
    description: "Bring ambitious people together across institutions, disciplines, and borders.",
  },
  {
    icon: Code,
    title: "Build",
    description: "Transform ideas into real projects that solve meaningful problems.",
  },
  {
    icon: Rocket,
    title: "Elevate",
    description: "Help members grow personally and professionally through mentorship and opportunity.",
  },
];

export const CORE_VALUES: CoreValue[] = [
  {
    icon: Search,
    title: "Curiosity",
    description: "We ask why, explore deeply, and never stop questioning how things could be better.",
  },
  {
    icon: Users,
    title: "Collaboration",
    description: "The best work happens when diverse minds come together around a shared purpose.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description: "We challenge convention and create new paths where none existed before.",
  },
  {
    icon: Award,
    title: "Excellence",
    description: "We hold ourselves to high standards and take pride in the quality of what we build.",
  },
  {
    icon: Heart,
    title: "Inclusivity",
    description: "Every voice matters. We build a space where anyone with drive can belong.",
  },
  {
    icon: BookOpen,
    title: "Continuous Learning",
    description: "Growth is a journey, not a destination. We learn, share, and grow together.",
  },
];

export const ROLES: Role[] = [
  { icon: Code, title: "Developers" },
  { icon: Palette, title: "Designers" },
  { icon: Cpu, title: "Engineers" },
  { icon: Briefcase, title: "Entrepreneurs" },
  { icon: Search, title: "Researchers" },
  { icon: GraduationCap, title: "Students" },
  { icon: Pen, title: "Creators" },
  { icon: Lightbulb, title: "Innovators" },
];

export const ECOSYSTEM_ITEMS: EcosystemItem[] = [
  {
    icon: GitBranch,
    title: "Branches",
    description: "Local chapters at institutions worldwide — your home base for connection and events.",
  },
  {
    icon: Users,
    title: "Teams",
    description: "Cross-disciplinary squads formed around projects, ideas, and shared goals.",
  },
  {
    icon: Layers,
    title: "Projects",
    description: "Hands-on work that matters — from open-source tools to real-world solutions.",
  },
  {
    icon: Calendar,
    title: "Events",
    description: "Hackathons, talks, workshops and meetups that spark collaboration and growth.",
  },
  {
    icon: Sparkles,
    title: "Showcase",
    description: "A platform to share your work, celebrate wins, and inspire the next builder.",
  },
  {
    icon: TrendingUp,
    title: "Growth",
    description: "Resources, mentorship, and pathways that turn potential into lasting impact.",
  },
];
