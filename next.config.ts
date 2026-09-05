import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://21.0.7.75:3000",
    // Arena/e2b sandbox preview hosts
    "*.e2b.app",
  ],
};

export default nextConfig;