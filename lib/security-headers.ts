/**
 * Shared security-header values for pages (via proxy.ts / next.config.mjs)
 * and JSON API routes.
 *
 * NOTE: no enforcing `Content-Security-Policy` with `script-src` here — a
 * static script CSP breaks Next.js inline hydration scripts. Script lockdown
 * requires nonce-based middleware (future work); until then this module
 * ships a strict `Content-Security-Policy-Report-Only` policy so violations
 * are visible in the console without breaking the app.
 */

export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  // Report-only (no report-uri endpoint yet — violations surface in the
  // console). Enforcing script-src requires nonce-based middleware.
  "Content-Security-Policy-Report-Only":
    "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
};

/** JSON API responses: private, uncacheable, unsniffable, no referrer. */
export function secureJsonHeaders(): Record<string, string> {
  return {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
}

/** Apply page security headers to a NextResponse (mutates + returns it). */
export function applySecurityHeaders<T extends { headers: Headers }>(response: T): T {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}
