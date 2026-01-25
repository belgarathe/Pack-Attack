import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Enable image optimization for external images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/avif', 'image/webp'],
    // Minimize initial load
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
  },
  productionBrowserSourceMaps: false,
  // Enable compression
  compress: true,
  // Experimental performance features
  experimental: {
    // Optimize package imports for smaller bundle
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;

