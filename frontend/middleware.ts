import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/auth/callback'];

// Routes that require full registration
const PROTECTED_ROUTES = ['/dashboard', '/courses', '/my-courses', '/learn', '/settings', '/progress', '/schedule', '/study-plan'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  // Skip middleware for static files, API routes, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Has file extension
  ) {
    return response;
  }

  try {
    // Create Supabase client for middleware
    const supabase = createMiddlewareClient({ req: request, res: response });

    // Get session
    const { data: { session } } = await supabase.auth.getSession();

    // Check if route is public
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

    // If user has session and is on login/register page, redirect to dashboard
    if (session && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // If no session and trying to access protected route, redirect to login
    if (!session && isProtectedRoute) {
      const redirectUrl = new URL('/login', request.url);
      // Save the intended destination
      redirectUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Allow the request to continue
    return response;
  } catch (error) {
    console.error('[Middleware] Error checking auth:', error);
    // On error, allow the request to continue
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public|images|fonts).*)',
  ],
};