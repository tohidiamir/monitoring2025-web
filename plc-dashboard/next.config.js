/** @type {import('next').NextConfig} */
const nextConfig = {
  // No experimental flags needed for Next.js 14.0.4
  webpack: (config) => {
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });
    return config;
  },
};

module.exports = nextConfig;
