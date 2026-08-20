import { Badge } from "@/components/ui/badge";

const CATEGORY_COLORS: Record<string, string> = {
  "Technology": "border-blue-500/30 bg-blue-500/10 text-blue-300",
  "AI": "border-purple-500/30 bg-purple-500/10 text-purple-300",
  "Cybersecurity": "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  "Design": "border-pink-500/30 bg-pink-500/10 text-pink-300",
  "Business": "border-amber-500/30 bg-amber-500/10 text-amber-300",
  "Entrepreneurship": "border-orange-500/30 bg-orange-500/10 text-orange-300",
  "Robotics": "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  "Game Development": "border-rose-500/30 bg-rose-500/10 text-rose-300",
  "Research": "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
  "Open Source": "border-green-500/30 bg-green-500/10 text-green-300",
  "Other": "border-ink-500/30 bg-ink-500/10 text-ink-300",
};

interface TeamCategoryBadgeProps {
  name: string | null;
  className?: string;
}

export function TeamCategoryBadge({ name, className }: TeamCategoryBadgeProps) {
  if (!name) return null;

  const colorClass = CATEGORY_COLORS[name] ?? "border-ink-500/30 bg-ink-500/10 text-ink-300";

  return (
    <Badge className={`${colorClass} ${className ?? ""}`}>
      {name}
    </Badge>
  );
}
