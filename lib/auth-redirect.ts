/**
 * Validate a `next` query param used to return a user to their intended
 * destination after authentication. Only same-origin relative paths are
 * accepted so absolute URLs, protocol-relative URLs (`//`), backslash tricks
 * and `javascript:`/`data:`-style schemes can never escape azenion.com.
 */
export function sanitizeNextPath(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  // Browsers normalise backslashes to slashes, so a path like `/\evil.com`
  // would resolve to `//evil.com`. Control chars/whitespace would corrupt a
  // Location header and are never valid in a route.
  if (/[\\\s\x00-\x1f\x7f]/.test(value)) return null;
  return value;
}
