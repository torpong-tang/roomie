import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  basePath: "/roomie",
  assetPrefix: "/roomie",
  output: "standalone",
};

export default nextConfig;
