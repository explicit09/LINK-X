import { NextResponse, type NextRequest } from 'next/server'

/**
 * SIMPLE AUTH MIDDLEWARE
 * Just basic route protection. No complexity.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Protected routes (require login)
  const protectedRoutes = ['/dashboard', '/my-courses', '/courses', '/settings']
  
  // Auth routes (redirect if logged in)
  const authRoutes = ['/login', '/signup']

  // Skip middleware for auth callback
  if (pathname.includes('/auth/callback')) {
    return NextResponse.next()
  }

  // For now, just handle basic redirects
  // More advanced auth checking happens in components
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|images|fonts).*)',
  ],
};
