/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Enforced by the browser only over HTTPS; harmless over HTTP.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Minimal CSP covering clickjacking only. Full CSP intentionally deferred.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  poweredByHeader: false,
  compress: true,
  // VS Code port-forwarding (e.g. https://xxx-3000.app.github.dev) reaches the
  // dev server through a forwarded host that does not match localhost. That
  // trips Next's cross-origin dev guard (allowedDevOrigins) and the Server
  // Actions CSRF check (serverActions.allowedOrigins), aborting form submits
  // with "Invalid Server request". Allow the forwarded origins in dev only.
  allowedDevOrigins: ["localhost", "127.0.0.1", "*.app.github.dev", "*.github.dev"],
<<<<<<< HEAD
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost", "127.0.0.1", "*.app.github.dev", "*.github.dev"],
      // Course file uploads flow through Server Actions (up to 100MB in
      // academy-courses.actions.ts), but Next.js caps action bodies at 1MB by
      // default, which aborts uploads with "Body exceeded 1 MB limit".
      bodySizeLimit: "110mb",
    },
    optimizePackageImports: ["@supabase/supabase-js", "sonner"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
=======
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost", "127.0.0.1", "*.app.github.dev", "*.github.dev"],
      // Course file uploads flow through Server Actions (up to 100MB in
      // academy-courses.actions.ts), but Next.js caps action bodies at 1MB by
      // default, which aborts uploads with "Body exceeded 1 MB limit".
      bodySizeLimit: "110mb",
    },
    optimizePackageImports: ["@supabase/supabase-js", "sonner"],
  },
>>>>>>> 1602953abf04ad8ff52e495c6074a1ca86fa00d5
  distDir: process.env.NEXT_PROD_DIST ? process.env.NEXT_PROD_DIST : ".next",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
