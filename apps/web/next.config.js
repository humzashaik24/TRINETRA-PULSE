/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  transpilePackages: ['@trinetra-pulse/types', '@trinetra-pulse/ui'],
};

module.exports = nextConfig;
