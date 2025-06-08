// Authentication System - OAuth Callback Route Handler
// Phase 3: Social OAuth Integration
// File: app/auth/callback/route.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { routeConfig, authConfig } from '@/lib/auth/config'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const state = requestUrl.searchParams.get('state')
  const type = requestUrl.searchParams.get('type') // For password reset, email confirmation
  
  console.log('[OAuth Callback] Processing callback:', {
    hasCode: !!code,
    error,
    type,
    origin: requestUrl.origin
  })

  // Handle OAuth errors
  if (error) {
    console.error('[OAuth Callback] OAuth error:', error, errorDescription)
    
    const errorUrl = new URL(routeConfig.login, requestUrl.origin)
    errorUrl.searchParams.set('error', error)
    errorUrl.searchParams.set('message', errorDescription || 'Authentication failed')
    
    return NextResponse.redirect(errorUrl)
  }

  // Handle authorization code exchange
  if (code) {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      authConfig.supabase.url,
      authConfig.supabase.anonKey,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    try {
      console.log('[OAuth Callback] Exchanging code for session')
      
      const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('[OAuth Callback] Code exchange failed:', exchangeError)
        
        const errorUrl = new URL(routeConfig.login, requestUrl.origin)
        errorUrl.searchParams.set('error', 'exchange_failed')
        errorUrl.searchParams.set('message', 'Failed to complete authentication')
        
        return NextResponse.redirect(errorUrl)
      }

      if (session?.user) {
        console.log('[OAuth Callback] Session established for user:', session.user.id)
        
        // Determine redirect destination
        let redirectTo = routeConfig.dashboard
        
        // Check for stored redirect URL
        const savedRedirect = cookieStore.get('auth-redirect')?.value
        if (savedRedirect) {
          redirectTo = savedRedirect
          // Clear the stored redirect
          const response = NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
          response.cookies.delete('auth-redirect')
          return response
        }
        
        // Handle password reset flow
        if (type === 'recovery') {
          redirectTo = '/auth/reset-password'
        }
        
        // Handle email confirmation
        if (type === 'signup') {
          redirectTo = `${routeConfig.dashboard}?welcome=true`
        }
        
        console.log('[OAuth Callback] Redirecting to:', redirectTo)
        return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
      }
    } catch (err) {
      console.error('[OAuth Callback] Unexpected error:', err)
      
      const errorUrl = new URL(routeConfig.login, requestUrl.origin)
      errorUrl.searchParams.set('error', 'unexpected_error')
      errorUrl.searchParams.set('message', 'An unexpected error occurred')
      
      return NextResponse.redirect(errorUrl)
    }
  }

  // Handle email confirmation without code (direct link)
  if (type === 'email_confirmation') {
    console.log('[OAuth Callback] Email confirmation detected')
    
    const successUrl = new URL(routeConfig.login, requestUrl.origin)
    successUrl.searchParams.set('message', 'Email confirmed successfully! You can now sign in.')
    
    return NextResponse.redirect(successUrl)
  }

  // If no code and no specific type, redirect to login
  console.log('[OAuth Callback] No code found, redirecting to login')
  
  const loginUrl = new URL(routeConfig.login, requestUrl.origin)
  loginUrl.searchParams.set('message', 'Authentication cancelled or incomplete')
  
  return NextResponse.redirect(loginUrl)
}