import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // The generated Prisma client (src/generated/prisma) imports the client runtime
  // from node_modules — keep these packages external so the bundler does not try
  // to package the native libSQL module.
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