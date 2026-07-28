import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Internal workspace packages ship TypeScript source; Next transpiles them.
  transpilePackages: ["@repo/db", "@repo/shared", "@repo/agent"],
};

export default nextConfig;
