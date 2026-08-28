import { Search, Terminal, Code2, FlaskConical } from "lucide-react";
import type { LabType, LabDifficulty } from "@/lib/validations/lab.schema";

export interface LabTypeMeta {
  label: string;
  icon: typeof Search;
  iconClass: string;
  ringClass: string;
}

// Subtle, type-specific visual language (investigation for OSINT, terminal
// for Linux, code for Coding) while staying within the existing Azenion
// accent system -- no new colors are introduced, only which existing
// accent/utility hues each type leans on.
export const LAB_TYPE_META: Record<LabType, LabTypeMeta> = {
  osint: {
    label: "OSINT",
    icon: Search,
    iconClass: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    ringClass: "from-amber-500/10",
  },
  linux: {
    label: "Linux",
    icon: Terminal,
    iconClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    ringClass: "from-emerald-500/10",
  },
  coding: {
    label: "Coding",
    icon: Code2,
    iconClass: "border-accent-400/30 bg-accent/10 text-accent-300",
    ringClass: "from-accent/10",
  },
};

export const DEFAULT_LAB_TYPE_META: LabTypeMeta = {
  label: "Lab",
  icon: FlaskConical,
  iconClass: "border-accent-400/30 bg-accent/10 text-accent-300",
  ringClass: "from-accent/10",
};

export function labTypeMeta(type: string | null | undefined): LabTypeMeta {
  if (!type) return DEFAULT_LAB_TYPE_META;
  return LAB_TYPE_META[type as LabType] ?? { ...DEFAULT_LAB_TYPE_META, label: type };
}

export const DIFFICULTY_CLASS: Record<LabDifficulty, string> = {
  beginner: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  intermediate: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  advanced: "border-red-500/30 bg-red-500/10 text-red-300",
};

export function difficultyClass(difficulty: string | null | undefined): string {
  return DIFFICULTY_CLASS[difficulty as LabDifficulty] ?? "border-border-strong bg-surface text-ink-400";
}
