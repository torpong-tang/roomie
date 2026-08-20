import type { NextConfig } from "next";

const normalizeBasePath = (value: string | undefined) => {
  if (value === undefined) return "/roomie";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") return "";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
};

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
const apiProxyOrigin = process.env.ROOMIE_API_PROXY_URL?.trim().replace(/\/+$/, "");

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  basePath,
  assetPrefix: basePath || undefined,
  output: "standalone",
  async rewrites() {
    if (!apiProxyOrigin) return { beforeFiles: [], afterFiles: [], fallback: [] };

    return {
      beforeFiles: [{
        source: basePath ? `${basePath}/api/:path*` : "/api/:path*",
        destination: `${apiProxyOrigin}/api/:path*`,
        basePath: false,
      }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
