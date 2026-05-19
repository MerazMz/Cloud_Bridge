import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // big-integer is used by GramJS and needs native Node.js modules
  serverExternalPackages: ["big-integer"],
};

export default nextConfig;
