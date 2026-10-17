import type { NextConfig } from "next";

// `output: "export"` is only needed for the Capacitor APK build
// (run it with: bun run build:static).
// In dev/preview we keep the default server mode so dynamic API routes
// (POST /api/matches) work. See src/app/api/matches/route.ts.
const nextConfig: NextConfig = {
  output: process.env.STATIC_EXPORT === "1" ? "export" : undefined,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
