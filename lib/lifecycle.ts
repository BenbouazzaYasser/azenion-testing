export const LIFECYCLE = {
  projectInactiveDays: 30,
  projectArchiveDays: 60,
  teamInactiveDays: 45,
  teamHiddenDays: 90,
} as const;

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysSince(date: string | null | undefined, now = Date.now()): number {
  if (!date) return 0;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, (now - t) / MS_PER_DAY);
}

export function getProjectLifecycleStatus(
  lastActivityAt: string | null | undefined,
  now = Date.now(),
): "ACTIVE" | "INACTIVE" | "ARCHIVED" {
  const d = daysSince(lastActivityAt, now);
  if (d > LIFECYCLE.projectArchiveDays) return "ARCHIVED";
  if (d > LIFECYCLE.projectInactiveDays) return "INACTIVE";
  return "ACTIVE";
}

export function getTeamStatus(
  lastActivityAt: string | null | undefined,
  now = Date.now(),
): "active" | "inactive" {
  return daysSince(lastActivityAt, now) >= LIFECYCLE.teamInactiveDays ? "inactive" : "active";
}

export function isTeamHidden(lastActivityAt: string | null | undefined, now = Date.now()): boolean {
  return daysSince(lastActivityAt, now) >= LIFECYCLE.teamHiddenDays;
}
