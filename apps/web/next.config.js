/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  transpilePackages: ['@trinetra-pulse/types', '@trinetra-pulse/ui'],
  // Transformers.js (Phase 25 local Whisper) ships node-only bindings that
  // must never be bundled for the browser. See the official Next.js tutorial:
  // https://huggingface.co/docs/transformers.js/tutorials/next
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      'onnxruntime-node$': false,
    };
    return config;
  },
};

module.exports = nextConfig;