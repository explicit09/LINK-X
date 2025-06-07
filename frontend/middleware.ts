import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for static files, API routes, auth callback, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname === '/auth/callback' || // Always allow auth callback
    pathname.includes('.') // Has file extension
  ) {
    return NextResponse.next();
  }

  console.log('[Middleware] Processing:', pathname);

  // Define protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/my-courses',
    '/courses',
    '/settings',
    '/schedule',
    '/study-plan',
    '/progress',
    '/analytics',
    '/community',
    '/messages',
    '/personalize'
  ];

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/auth/callback',
    '/onboarding'  // Allow onboarding for authenticated but unregistered users
  ];

  // Check if current route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if current route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route)
  );

  // Allow public routes without authentication check
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For protected routes, check for authentication
  if (isProtectedRoute) {
    // Check for Supabase session cookie
    const supabaseAccessToken = request.cookies.get('sb-access-token')?.value;
    const supabaseRefreshToken = request.cookies.get('sb-refresh-token')?.value;
    
    // Simple authentication check - if no tokens, redirect to login
    if (!supabaseAccessToken && !supabaseRefreshToken) {
      console.log('[Middleware] No auth tokens found, redirecting to login');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // If we have tokens, let the request through
    // React components will handle more detailed auth checks
    console.log('[Middleware] Auth tokens found, allowing access');
    return NextResponse.next();
  }

  // For routes that aren't explicitly public or protected, allow through
  // This handles dynamic routes and other edge cases
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|images|fonts).*)',
  ],
};
