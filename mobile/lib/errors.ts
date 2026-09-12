/**
 * Maps raw transport/database errors to human-readable messages.
 * Server-provided messages (API routes, validation) pass through untouched;
 * only low-level failure shapes are translated. Never includes tokens,
 * URLs, or raw SQL.
 */
export function friendlyError(e: unknown, fallback = "Something went wrong. Please retry."): string {
  const raw = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  if (!raw) return fallback;
  if (/network request failed|networkerror|fetch failed|timed out|timeout|econn|enotfound|offline/i.test(raw)) {
    return "You're offline. Check your connection and retry.";
  }
  if (/new row violates row-level security|row-level security|permission denied/i.test(raw)) {
    return "Not allowed.";
  }
  if (/duplicate key|already exists|23505/i.test(raw)) {
    return "Already done.";
  }
  if (/invalid login credentials|invalid_grant/i.test(raw)) {
    return "Incorrect email or password.";
  }
  if (/user already registered|already exists/i.test(raw)) {
    return "An account with this email already exists.";
  }
  if (/password should be at least|weak password/i.test(raw)) {
    return "Password is too short (minimum 6 characters).";
  }
  return raw.length > 160 ? fallback : raw;
}
