import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Prisma Next's SQLite façade talks to the database through Node's built-in
  // `node:sqlite` driver. Keeping the package external stops the bundler from
  // rewriting its dynamic requires and the `node:` import.
  serverExternalPackages: ["@prisma/orm-sqlite"],
  allowedDevOrigins: [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://21.0.7.75:3000",
    // Arena/e2b sandbox preview hosts
    "*.e2b.app",
    // Base44 preview origin — derived at runtime from the public host suffix
    ...(process.env.BASE44_PUBLIC_HOST_SUFFIX
      ? [`3000-${process.env.BASE44_PUBLIC_HOST_SUFFIX}`]
      : []),
  ],
};

export default nextConfig;