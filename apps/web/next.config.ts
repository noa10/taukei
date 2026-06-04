import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@taukei/env", "@taukei/domain"],
  turbopack: {
    root: path.join(process.cwd(), "../..")
  }
};

export default nextConfig;
