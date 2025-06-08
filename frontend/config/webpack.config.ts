import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import type { Configuration } from 'webpack';

/**
 * Webpack configuration and optimizations
 * EXTRACTED from next.config.ts to focus on webpack settings
 */

export const webpackConfig = (config: Configuration, { isServer }: { isServer: boolean }) => {
  // Bundle analyzer in development
  if (process.env.ANALYZE === 'true' && !isServer) {
    config.plugins?.push(
      new BundleAnalyzerPlugin({
        analyzerMode: 'server',
        analyzerPort: 8888,
        openAnalyzer: true,
      })
    );
  }

  // Resolve configuration
  if (config.resolve) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, '../'),
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
    };
  }

  // Optimization settings
  if (!isServer && config.optimization) {
    // Simplified code splitting to avoid runtime errors
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        // Framework chunks
        framework: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'framework',
          priority: 40,
          reuseExistingChunk: true,
          chunks: 'all',
        },
        // UI libraries together to avoid import conflicts
        ui: {
          test: /[\\/]node_modules[\\/](@radix-ui|@headlessui|framer-motion|lucide-react)[\\/]/,
          name: 'ui-components',
          priority: 30,
          reuseExistingChunk: true,
          chunks: 'all',
        },
        // Supabase
        supabase: {
          test: /[\\/]node_modules[\\/](@supabase|supabase)[\\/]/,
          name: 'supabase',
          priority: 20,
          reuseExistingChunk: true,
          chunks: 'all',
        },
        // Default vendors
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          priority: 10,
          reuseExistingChunk: true,
          chunks: 'all',
        },
      },
    };

    // Runtime chunk optimization
    config.optimization.runtimeChunk = {
      name: 'runtime',
    };
  }

  return config;
};