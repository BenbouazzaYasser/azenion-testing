/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    localPatterns: [
      { pathname: "/logo.svg" },
      { pathname: "/api/academy/courses/*/file", search: "?view=thumbnail" },
    ],
    remotePatterns: [
      { protocol: "https", hostname: "cytwlxpomhzdezgwlbhv.supabase.co" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  // Performance optimizations
  compress: true,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,

  // Global security headers (H6). No enforcing script-src CSP here — a
  // static script CSP breaks Next.js inline hydration scripts; script
  // lockdown requires nonce-based middleware (see lib/security-headers.ts).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value:
              "default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; img-src 'self' blob: https://*.supabase.co https://lh3.googleusercontent.com; media-src 'self' https://*.supabase.co; script-src 'self' 'unsafe-eval'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
          },
        ],
      },
      {
        // Course previews are rendered in a same-origin iframe. Keep the
        // global clickjacking protection everywhere else.
        source: "/api/academy/courses/:path*/file",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },

  // Caching headers
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 5,
  },

  // Distdir configuration
  distDir: process.env.NEXT_PROD_DIST
    ? process.env.NEXT_PROD_DIST
    : ".next",

  reactCompiler: true,

  // Next 16: optimizePackageImports lives under experimental
  experimental: {
    optimizePackageImports: ["lucide-react", "sonner"],
  },
};

export default nextConfig;