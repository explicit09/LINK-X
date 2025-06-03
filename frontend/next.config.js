/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Minimal configuration to avoid vendor chunk issues
  experimental: {},
  
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
}

module.exports = nextConfig