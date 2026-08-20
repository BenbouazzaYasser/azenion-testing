const MONTHS: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const MONTH_KEYS = Object.keys(MONTHS).sort((a, b) => b.length - a.length);

/**
 * Best-effort parser for free-text event schedules like:
 *   "Saturday, August 12 / 14:00 - 17:30"
 *   "12 Aug 2026 / 2 PM - 5 PM"
 *   "August 12, 2026 at 2:00 PM"
 *   "2026-08-12T14:00:00.000Z"
 *
 * Returns a Date or null when no date can be derived. The derived date is used
 * only as an ordering key (upcoming vs past); the raw text is what is shown.
 */
export function parseEventSchedule(input: string | null | undefined): Date | null {
  if (!input) return null;
  const text = input.trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const iso = new Date(text);
    if (!Number.isNaN(iso.getTime())) return iso;
  }

  let hour = 12;
  let minute = 0;

  const ampm = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (ampm) {
    let h = parseInt(ampm[1] ?? "0", 10) % 12;
    if (/pm/i.test(ampm[3] ?? "")) h += 12;
    hour = h;
    minute = ampm[2] ? parseInt(ampm[2], 10) : 0;
  } else {
    const t24 = text.match(/(\d{1,2}):(\d{2})/);
    if (t24) {
      hour = parseInt(t24[1] ?? "0", 10) % 24;
      minute = parseInt(t24[2] ?? "0", 10);
    }
  }

  let month = -1;
  let day = -1;
  for (const key of MONTH_KEYS) {
    const after = text.match(new RegExp(`(?:${key})\\s+(\\d{1,2})`, "i"));
    if (after) {
      month = MONTHS[key] ?? -1;
      day = parseInt(after[1] ?? "0", 10);
      break;
    }
    const before = text.match(new RegExp(`(\\d{1,2})\\s+(?:${key})`, "i"));
    if (before) {
      month = MONTHS[key] ?? -1;
      day = parseInt(before[1] ?? "0", 10);
      break;
    }
  }

  if (month < 0 || day < 0) return null;

  const yearMatch = text.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1] ?? "0", 10) : new Date().getFullYear();

  const date = new Date(year, month, day, hour, minute);
  if (Number.isNaN(date.getTime())) return null;

  if (!yearMatch && date.getTime() < Date.now() - 86400000) {
    date.setFullYear(date.getFullYear() + 1);
  }

  return date;
}
