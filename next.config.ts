import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["socket.io", "pg", "@prisma/adapter-pg"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
