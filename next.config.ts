import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },

  // ✅ Keep this (important)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;