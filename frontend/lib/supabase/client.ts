/**
 * Supabase Browser Client
 * Client-side Supabase instance for use in React components and browser contexts
 */

import { createBrowserClient } from '@supabase/ssr'
import { getEnvironmentSpecificConfig } from '@/config/environment.config'

export function createClient() {
  const config = getEnvironmentSpecificConfig()
  
  return createBrowserClient(
    config.supabaseConfig.url,
    config.supabaseConfig.anonKey
  )
}