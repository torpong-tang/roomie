import type { NextConfig } from "next";

const normalizeBasePath = (value: string | undefined) => {
  if (value === undefined) return process.env.VERCEL === "1" ? "" : "/roomie";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") return "";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
};

const isVercel = process.env.VERCEL === "1";
// Vercel serves Roomie at the project root. Ignore a stale `/roomie` value in
// the Vercel project settings so assets and API rewrites cannot drift back to
// the VPS subpath configuration.
const basePath = isVercel
  ? ""
  : normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
const configuredApiProxyOrigin = process.env.ROOMIE_API_PROXY_URL?.trim().replace(/\/+$/, "");
const apiProxyOrigin = configuredApiProxyOrigin
  || (isVercel ? "https://2startup.cloud/roomie" : undefined);

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  basePath,
  assetPrefix: basePath || undefined,
  // Vercel owns its server trace/output. Standalone packaging is only for the
  // VPS process started by PM2; enabling it on Vercel breaks onBuildComplete.
  ...(isVercel ? {} : { output: "standalone" as const }),
  async headers() {
    return [{
      source: basePath ? `${basePath}/api/:path*` : "/api/:path*",
      headers: [
        { key: "Cache-Control", value: "private, no-store, max-age=0" },
        { key: "Vary", value: "Cookie, Origin" },
      ],
      basePath: false,
    }];
  },
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
