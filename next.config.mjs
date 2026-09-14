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