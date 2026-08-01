const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function formatDistanceToNow(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < MINUTE) {
    return diffSec <= 5 ? "just now" : `${diffSec} seconds ago`;
  }

  if (diffSec < HOUR) {
    const mins = Math.floor(diffSec / MINUTE);
    return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  }

  if (diffSec < DAY) {
    const hours = Math.floor(diffSec / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (diffSec < WEEK) {
    const days = Math.floor(diffSec / DAY);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  if (diffSec < MONTH) {
    const weeks = Math.floor(diffSec / WEEK);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }

  if (diffSec < YEAR) {
    const months = Math.floor(diffSec / MONTH);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }

  const years = Math.floor(diffSec / YEAR);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_SHORT_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = MONTH_NAMES[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getDate()} ${MONTH_SHORT_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
