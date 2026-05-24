import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // big-integer is used by GramJS and needs native Node.js modules
  serverExternalPackages: ["big-integer"],
};

export default nextConfig;
