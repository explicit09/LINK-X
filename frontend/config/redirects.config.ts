/**
 * Redirects and rewrites configuration for Next.js
 * EXTRACTED from next.config.ts to focus on routing settings
 */

export const redirectsConfig = {
  // Redirects for cleaner URLs and SEO
  redirects: async () => [
    // Legacy route redirects
    {
      source: '/dashboard/professor',
      destination: '/dashboard',
      permanent: true,
    },
    {
      source: '/dashboard/student',
      destination: '/dashboard',
      permanent: true,
    },
    // Auth redirects
    {
      source: '/auth/signin',
      destination: '/login',
      permanent: true,
    },
    {
      source: '/auth/signup',
      destination: '/register',
      permanent: true,
    },
    // Course redirects
    {
      source: '/course/:id',
      destination: '/courses/:id',
      permanent: true,
    },
    // Settings redirects
    {
      source: '/profile',
      destination: '/settings',
      permanent: true,
    },
  ],

  // Rewrites for API proxying and clean URLs
  rewrites: async () => [
    // API rewrites for cleaner endpoints
    {
      source: '/api/auth/:path*',
      destination: `${process.env.NEXT_PUBLIC_API_URL}/api/auth/:path*`,
    },
    {
      source: '/api/courses/:path*',
      destination: `${process.env.NEXT_PUBLIC_API_URL}/api/v2/courses/:path*`,
    },
    {
      source: '/api/files/:path*',
      destination: `${process.env.NEXT_PUBLIC_API_URL}/api/v2/files/:path*`,
    },
    {
      source: '/api/streaming/:path*',
      destination: `${process.env.NEXT_PUBLIC_API_URL}/api/v2/streaming/:path*`,
    },
    // Health check rewrite
    {
      source: '/health',
      destination: `${process.env.NEXT_PUBLIC_API_URL}/api/health`,
    },
  ],
};