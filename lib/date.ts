const RELATIVE_FMT = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});
const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDistanceToNow(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return RELATIVE_FMT.format(-diffSec, "second");
  if (diffMin < 60) return RELATIVE_FMT.format(-diffMin, "minute");
  if (diffHour < 24) return RELATIVE_FMT.format(-diffHour, "hour");
  if (diffDay < 7) return RELATIVE_FMT.format(-diffDay, "day");
  if (diffWeek < 4) return RELATIVE_FMT.format(-diffWeek, "week");
  if (diffMonth < 12) return RELATIVE_FMT.format(-diffMonth, "month");
  return RELATIVE_FMT.format(-diffYear, "year");
}

export function formatDate(dateString: string): string {
  return DATE_FMT.format(new Date(dateString));
}

export function formatTime(dateString: string): string {
  return TIME_FMT.format(new Date(dateString));
}

const SHORT_MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function formatShortDate(dateString: string): string {
  const d = new Date(dateString);
  return `${d.getDate()} ${SHORT_MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Formats an elapsed duration in seconds as a clock (mm:ss, or hh:mm:ss once
 * it reaches the hour mark). Used for live call duration.
 *
 * ponytail: no native equivalent for clock formatting — the platform ships
 * `Intl.DurationFormat` (stage 3) which would cover this, but it is not
 * widely supported yet. Upgrade path: swap for `Intl.DurationFormat` once
 * the target browsers support it.
 */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) return `${String(hours).padStart(2, "0")}:${mm}:${ss}`;
  return `${minutes}:${ss}`;
}
