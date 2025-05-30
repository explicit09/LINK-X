import type { NextConfig } from 'next';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

const nextConfig: NextConfig = {
  /* Performance optimizations */
  distDir: '.next',
  
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
  
  // Enable React strict mode for better error detection
  reactStrictMode: true,
  
  // Compression and optimization
  compress: true,
  poweredByHeader: false,
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    // Use emotion for better CSS-in-JS performance
    emotion: true,
  },
  
  // Optimize CSS
  sassOptions: {
    includePaths: ['./app/styles'],
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        protocol: 'https',
        hostname: 'cdn.learnx.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Optimize image loading
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Optimize module resolution
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
    '@radix-ui/react-icons': {
      transform: '@radix-ui/react-icons/dist/{{member}}',
    },
    'lodash': {
      transform: 'lodash/{{member}}',
    },
  },
  
  // Bundle optimization
  webpack: (config, { dev, isServer, webpack }) => {
    // Add bundle analyzer in production build with ANALYZE=true
    if (process.env.ANALYZE === 'true' && !isServer) {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: './analyze.html',
          openAnalyzer: true,
        })
      );
    }
    
    // Development performance optimizations
    if (dev) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
      
      config.watchOptions = {
        ignored: ['**/node_modules', '**/.next'],
      };
    }
    
    // Production optimizations
    if (!dev) {
      // Enable module concatenation
      config.optimization.concatenateModules = true;
      
      // Aggressive code splitting for production
      if (!isServer) {
        config.optimization.splitChunks = {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          maxSize: 244000, // 244 KB max chunk size
          cacheGroups: {
            // React and core dependencies
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
              name: 'react',
              priority: 30,
              reuseExistingChunk: true,
            },
            // UI library chunks
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|react-icons)[\\/]/,
              name: 'ui-components',
              priority: 25,
              reuseExistingChunk: true,
            },
            // Form and validation
            forms: {
              test: /[\\/]node_modules[\\/](react-hook-form|zod|@hookform)[\\/]/,
              name: 'forms',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Data fetching and state
            data: {
              test: /[\\/]node_modules[\\/](swr|axios|@tanstack[\\/]react-query)[\\/]/,
              name: 'data-fetching',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Utilities
            utils: {
              test: /[\\/]node_modules[\\/](lodash|date-fns|clsx|tailwind-merge)[\\/]/,
              name: 'utils',
              priority: 15,
              reuseExistingChunk: true,
            },
            // Firebase
            firebase: {
              test: /[\\/]node_modules[\\/](@firebase|firebase)[\\/]/,
              name: 'firebase',
              priority: 15,
              reuseExistingChunk: true,
            },
            // Default vendors
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Common modules
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        };
        
        // Runtime chunk optimization
        config.optimization.runtimeChunk = {
          name: 'runtime',
        };
      }
      
      // Minimize main bundle
      config.optimization.minimize = true;
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // Replace heavy libraries with lighter alternatives
      config.resolve.alias = {
        ...config.resolve.alias,
        'moment': 'date-fns',
        'lodash': 'lodash-es',
      };
    }
    
    // Add webpack aliases for cleaner imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': './app',
      '@components': './components',
      '@lib': './lib',
      '@hooks': './hooks',
      '@types': './types',
    };
    
    // Ignore unnecessary files
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      })
    );
    
    return config;
  },
  
  // Output configuration
  output: 'standalone',
  
  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Redirects for performance
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // Environment variables to expose to the browser
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },
};

export default nextConfig;