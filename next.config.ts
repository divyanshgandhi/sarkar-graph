import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "upload.wikimedia.org" }],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // server routes read the compiled graph + news archive from disk
  outputFileTracingIncludes: {
    "/api/live": ["./data/**/*.json", "./public/data/graph/in.json"],
    "/api/live/stream": ["./data/**/*.json", "./public/data/graph/in.json"],
    "/[gov]": ["./public/data/graph/*.json", "./src/data/*.json"],
    "/[gov]/[id]": ["./public/data/graph/*.json", "./src/data/*.json"],
  },
  async headers() {
    return [
      {
        source: "/data/graph/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
