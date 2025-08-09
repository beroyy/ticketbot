/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ticketsbot/core/auth", "@ticketsbot/core"],
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
      {
        protocol: "https",
        hostname: "media.tenor.com",
      },
      {
        protocol: "https",
        hostname: "media.giphy.com",
      },
    ],
    formats: ["image/webp", "image/avif"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    // Only proxy in development - production uses direct API URL with proper domain cookies
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/api/v1/:path*",
          destination: "http://localhost:3001/:path*",
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
