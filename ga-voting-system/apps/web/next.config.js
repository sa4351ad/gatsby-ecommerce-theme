/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ga/shared"],
  images: {
    remotePatterns: [{ protocol: "http", hostname: "localhost" }],
  },
};

module.exports = nextConfig;
