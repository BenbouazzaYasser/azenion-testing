/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  distDir: process.env.NEXT_PROD_DIST ? process.env.NEXT_PROD_DIST : ".next",
};

export default nextConfig;
