/**
 * Supabase Client Configuration
 * Single source of truth for Supabase client - re-exports singleton
 */
import type { SupabaseClient } from '@supabase/supabase-js'

// Re-export the singleton Supabase client and related functions from supabaseconfig.ts
export { supabase, getCurrentUser as getUser } from '@/supabaseconfig'
export type { SupabaseClient }

// Helper to check if we're in the browser
export const isBrowser = () => typeof window !== 'undefined'

// Helper to get the current session
export const getSession = async () => {
  if (!isBrowser()) return null
  const { supabase } = await import('@/supabaseconfig')
  const { data } = await supabase.auth.getSession()
  return data.session
}