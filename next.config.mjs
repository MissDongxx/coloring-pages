import bundleAnalyzer from '@next/bundle-analyzer';
// import { createMDX } from 'fumadocs-mdx/next';
import createNextIntlPlugin from 'next-intl/plugin';

// const withMDX = createMDX({ ... });

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const withNextIntl = createNextIntlPlugin({
  requestConfig: './src/core/i18n/request.ts',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  staticPageGenerationTimeout: 180,
  reactStrictMode: false,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  images: {
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    qualities: [60, 70, 75],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*',
      },
    ],
  },
  async redirects() {
    return [];
  },
  async headers() {
    return [
      {
        source: '/imgs/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  turbopack: {
    resolveAlias: {},
  },
  webpack: (config) => {
    config.resolve.alias['@vercel/og'] = false;
    config.resolve.alias['next/og'] = false;
    return config;
  },
  experimental: {
    turbopackFileSystemCacheForDev: true,
    optimizePackageImports: ['lucide-react', '@tabler/icons-react'],
  },
  reactCompiler: true,
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
