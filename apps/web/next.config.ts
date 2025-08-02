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
  webpack: (config: any, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
    if (!dev && !isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "react-dom$": "react-dom/profiling",
        "scheduler/tracing": "scheduler/tracing-profiling",
      };
    }
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
