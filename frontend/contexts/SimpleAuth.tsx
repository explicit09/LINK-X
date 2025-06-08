'use client'

/**
 * SIMPLE AUTH PROVIDER
 * Enhanced to include essential profile data
 * - Basic profile data (name, onboarding status)
 * - No complex business logic
 * - Still simple and minimal
 */

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/supabaseconfig'

interface UserProfile {
  id: string
  email: string
  name?: string
  role?: 'student' | 'instructor' | 'admin'
  has_completed_onboarding?: boolean
}

interface SimpleAuthContextType {
  // Core state
  session: Session | null
  loading: boolean
  error: AuthError | null
  profile: UserProfile | null
  
  // Essential auth methods
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  clearError: () => void
  register: (email: string, password: string) => Promise<{ error: AuthError | null }>
  
  // Simple computed values
  isAuthenticated: boolean
  user: Session['user'] | null
  userName: string
  needsOnboarding: boolean
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined)

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // Fetch user profile from backend
  const fetchProfile = async (accessToken: string) => {
    try {
      const response = await fetch('/api/v2/auth/profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const profileData = await response.json()
        if (profileData.status === 'success') {
          setProfile({
            id: profileData.data.id,
            email: profileData.data.email,
            name: profileData.data.display_name || profileData.data.profile?.name,
            role: profileData.data.role,
            has_completed_onboarding: profileData.data.has_completed_onboarding
          })
        }
      } else {
        console.log('Profile not found in backend - user may need registration')
        setProfile(null)
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      setProfile(null)
    }
  }

  // Initialize - get session and profile
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          setError(error)
        } else {
          setSession(session)
          if (session?.access_token) {
            await fetchProfile(session.access_token)
          }
        }
      } catch (error) {
        console.error('Auth error:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setError(null)
        
        if (session?.access_token) {
          await fetchProfile(session.access_token)
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Auth methods - minimal and direct
  const signIn = async (email: string, password: string) => {
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error)
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    setError(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error)
    return { error }
  }

  const signInWithGoogle = async () => {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) setError(error)
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const clearError = () => {
    setError(null)
  }

  const register = async (email: string, password: string) => {
    // register is just an alias for signUp for compatibility
    return signUp(email, password)
  }

  // Computed values
  const isAuthenticated = !!session
  const userName = profile?.name || session?.user?.email?.split('@')[0] || 'User'
  const needsOnboarding = isAuthenticated && (!profile || profile.has_completed_onboarding === false)

  const value: SimpleAuthContextType = {
    session,
    loading,
    error,
    profile,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    clearError,
    register,
    isAuthenticated,
    user: session?.user || null,
    userName,
    needsOnboarding
  }

  return <SimpleAuthContext.Provider value={value}>{children}</SimpleAuthContext.Provider>
}

export function useSimpleAuth() {
  const context = useContext(SimpleAuthContext)
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider')
  }
  return context
} 