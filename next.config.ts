import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Prisma 6 with engineType "client" + driver adapters generates a hashed
  // client module that Turbopack/webpack cannot bundle. Keep these packages
  // external so Node loads them from node_modules at runtime.
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-libsql",
    "@libsql/client",
  ],
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