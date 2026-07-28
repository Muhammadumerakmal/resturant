import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The frontend only consumes shared types/helpers; the DB and agent live in
  // the backend service now. @repo/shared ships TS source, so Next transpiles it.
  transpilePackages: ["@repo/shared"],
};

export default nextConfig;
