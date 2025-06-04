import type { NextConfig } from 'next';

/**
 * Next.js configuration - SIMPLIFIED to ensure stability
 * Focusing on essential settings while maintaining modularity
 */

const nextConfig: NextConfig = {
  // Essential settings
  reactStrictMode: true,
  
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
  ],
  
  // Webpack configuration for development stability
  webpack: (config, { isServer }) => {
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