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
  "Permissions-Policy": "camera=(self), microphone=(self), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  // Report-only (no report-uri endpoint yet — violations surface in the
  // console). Enforcing script-src requires nonce-based middleware.
  // connect-src must cover Supabase (REST/wss realtime) or those console
  // warnings turn into real breakage the day this policy becomes enforcing.
  // img-src/media-src cover chat media signed URLs + avatars (Supabase CDN);
  // without them <img>/<audio>/<video> from those hosts gets flagged (and
  // would be blocked once this policy is enforced).
  // blob: for optimistic image previews; 'unsafe-eval' for Next.js dev
  // (hydration/inlining) — report-only so no breakage, just visibility.
  "Content-Security-Policy-Report-Only":
    "default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; img-src 'self' blob: https://*.supabase.co https://lh3.googleusercontent.com; media-src 'self' https://*.supabase.co; script-src 'self' 'unsafe-eval'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
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
