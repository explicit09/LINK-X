/**
 * Supabase Server Client
 * Server-side Supabase instance for use in API routes, middleware, and server components
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getEnvironmentSpecificConfig } from '@/config/environment.config'

export async function createClient() {
  const config = getEnvironmentSpecificConfig()
  const cookieStore = await cookies()

  return createServerClient(
    config.supabaseConfig.url,
    config.supabaseConfig.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}