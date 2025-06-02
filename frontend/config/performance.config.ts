/**
 * Performance optimization configuration for Next.js
 * EXTRACTED from next.config.ts to focus on performance settings
 */

export const performanceConfig = {
  // Enable experimental performance features
  experimental: {
    ppr: true,
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tooltip',
      'date-fns',
      'react-hook-form',
    ],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
    // Enable faster builds
    webpackBuildWorker: true,
    // Use SWC minifier for better performance
    forceSwcTransforms: true,
  },

  // Compression and optimization
  compress: true,
  poweredByHeader: false,

  // Compiler optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
    // Use emotion for better CSS-in-JS performance
    emotion: true,
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'] as const,
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Static optimization
  trailingSlash: false,
  generateEtags: true,
  
  // Output optimization
  distDir: '.next',
  cleanDistDir: true,
};