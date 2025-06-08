/**
 * UNIFIED AUTH TYPES
 * Central type definitions for authentication that align with SimpleAuth
 */

import { User as SupabaseUser } from '@supabase/supabase-js'

// Core auth types that align with SimpleAuth
export interface UserProfile {
  id: string
  email: string
  name?: string
  role?: 'student' | 'instructor' | 'admin'
  has_completed_onboarding?: boolean
}

// Component-friendly user type for UI components
export interface ComponentUser {
  name?: string
  email?: string
  avatar?: string
}

// Extended auth context type (matches SimpleAuth)
export interface AuthContextType {
  // Core state
  session: any | null
  loading: boolean
  error: any | null
  profile: UserProfile | null
  
  // Auth methods
  signIn: (email: string, password: string) => Promise<{ error: any | null }>
  signUp: (email: string, password: string) => Promise<{ error: any | null }>
  signInWithGoogle: () => Promise<{ error: any | null }>
  signOut: () => Promise<void>
  
  // Computed values
  isAuthenticated: boolean
  user: SupabaseUser | null
  userName: string
  needsOnboarding: boolean
}

// Helper function to convert SimpleAuth data to component-friendly format
export function toComponentUser(profile: UserProfile | null, user: SupabaseUser | null): ComponentUser | undefined {
  if (!profile && !user) return undefined
  
  return {
    name: profile?.name || user?.email?.split('@')[0],
    email: profile?.email || user?.email,
    avatar: undefined // No avatar support yet
  }
}

// Re-export Supabase User type for direct use
export type { User as SupabaseUser } from '@supabase/supabase-js' 