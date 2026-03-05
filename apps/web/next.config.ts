import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@madtv/shared"],
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
