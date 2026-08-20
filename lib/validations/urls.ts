/**
 * Allowlist check for user-clickable links. Only http / https schemes are
 * permitted so values like `javascript:`, `data:`, `vbscript:`, or
 * protocol-relative `//host/path` can never be stored and rendered as
 * clickable anchors.
 */
export function isAllowedSchemeUrl(value: string | null | undefined): boolean {
  if (value == null || value === "") return true;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

export const SAFE_HTTP_URL_MESSAGE = "URL must use http or https";