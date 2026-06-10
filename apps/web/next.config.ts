import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // All workspace packages must be listed so Turbopack pre-compiles them
  // instead of re-processing from scratch on every HMR cycle.
  transpilePackages: [
    "@taukei/env",
    "@taukei/domain",
    "@taukei/stripe",
    "@taukei/lalamove",
  ],
  turbopack: {
    root: path.join(process.cwd(), "../.."),
  },
};

export default nextConfig;
