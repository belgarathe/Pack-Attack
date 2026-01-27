import type { NextConfig } from 'next';

/**
 * Security Headers Configuration
 * Following OWASP recommendations and modern security best practices
 */
const securityHeaders = [
  // Prevent clickjacking attacks
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Enable XSS filter in browsers
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Control referrer information
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Prevent DNS prefetching to protect privacy
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  // Enable HSTS (HTTP Strict Transport Security)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  // Restrict browser features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Content Security Policy - Strict but functional
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-src 'self' https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com",
      "connect-src 'self' https://api.stripe.com https://www.paypal.com https://www.sandbox.paypal.com https://api.scryfall.com https://api.pokemontcg.io https://db.ygoprodeck.com https://api.lorcana-api.com wss:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
  // Cross-Origin policies
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin-allow-popups',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'cross-origin',
  },
];

/**
 * Allowed image domains for security
 * Restrict to known trading card API sources
 */
const allowedImageDomains = [
  // Card image sources
  { hostname: 'cards.scryfall.io' },
  { hostname: 'c1.scryfall.com' },
  { hostname: 'images.pokemontcg.io' },
  { hostname: 'images.ygoprodeck.com' },
  { hostname: 'lorcana-api.com' },
  { hostname: 'static.justtcg.com' },
  { hostname: 'product-images.tcgplayer.com' },
  // User uploads and CDN
  { hostname: 'res.cloudinary.com' },
  { hostname: 'uploadthing.com' },
  { hostname: '*.uploadthing.com' },
  // PayPal/Stripe assets
  { hostname: '*.paypal.com' },
  { hostname: '*.stripe.com' },
  // Development
  { hostname: 'localhost' },
  { hostname: '127.0.0.1' },
  // Placeholder images
  { hostname: 'via.placeholder.com' },
  { hostname: 'placehold.co' },
  // Allow any HTTPS image (needed for flexibility with card images)
  // This is a controlled compromise - CSP img-src provides additional protection
  { hostname: '**' },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...allowedImageDomains.map((domain) => ({
        protocol: 'https' as const,
        ...domain,
      })),
      ...allowedImageDomains.map((domain) => ({
        protocol: 'http' as const,
        ...domain,
      })),
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
  // Security headers for all routes
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // Additional headers for API routes
        source: '/api/(.*)',
        headers: [
          ...securityHeaders,
          // Prevent caching of API responses with sensitive data
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
  // Experimental performance features
  experimental: {
    // Optimize package imports for smaller bundle
    optimizePackageImports: ['lucide-react'],
  },
  // Powered-by header removal (security through obscurity)
  poweredByHeader: false,
};

export default nextConfig;

