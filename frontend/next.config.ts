import type { NextConfig } from 'next';
import path from 'path';

/**
 * Next.js configuration - SIMPLIFIED to ensure stability
 * Focusing on essential settings while maintaining modularity
 */

const nextConfig: NextConfig = {
  // Essential settings
  reactStrictMode: true,
  
  // Output configuration
  output: 'standalone',
  
  // Asset prefix configuration
  assetPrefix: process.env.ASSET_PREFIX || '',
  
  // Public runtime config
  publicRuntimeConfig: {
    staticFolder: '/_next/static',
  },
  
  // Basic experimental features
  experimental: {
    ppr: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Development settings
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'] as const,
    dangerouslyAllowSVG: true,
  },
  
  // Basic security headers
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ],
    },
    {
      source: '/fonts/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'public, immutable, max-age=31536000' },
      ],
    },
  ],
  
  // Rewrites for better asset handling
  rewrites: async () => ({
    beforeFiles: [],
    afterFiles: [],
    fallback: [],
  }),
  
  // Webpack configuration for development stability and path resolution
  webpack: (config, { isServer }) => {
    // Add path aliases to help with module resolution
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname),
      };
    }
    
    if (!isServer && config.resolve) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;