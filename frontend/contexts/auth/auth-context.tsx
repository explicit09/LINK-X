/**
 * Authentication Context
 * Provides auth state and methods to entire app
 */
'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/auth/supabase-client'
import { authService, type SignUpMetadata } from '@/lib/auth/auth-service'

export interface AuthContextValue {
  // State
  user: User | null
  session: Session | null
  loading: boolean
  error: AuthError | null
  
  // Computed properties
  isAuthenticated: boolean
  isStudent: boolean
  isInstructor: boolean
  isAdmin: boolean
  
  // Actions
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: SignUpMetadata) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  refreshSession: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)

  // Computed properties
  const isAuthenticated = !!user
  const isStudent = user?.user_metadata?.role === 'student'
  const isInstructor = user?.user_metadata?.role === 'instructor'
  const isAdmin = user?.user_metadata?.role === 'admin'

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    async function initializeAuth() {
      try {
        // Get initial session
        const currentSession = await authService.getSession()
        
        if (mounted) {
          if (currentSession) {
            setSession(currentSession)
            setUser(currentSession.user)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (mounted) {
        console.log('Auth state changed:', event)
        
        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            setSession(currentSession)
            setUser(currentSession?.user ?? null)
            break
            
          case 'SIGNED_OUT':
            setSession(null)
            setUser(null)
            router.push('/login')
            break
            
          case 'USER_UPDATED':
            setSession(currentSession)
            setUser(currentSession?.user ?? null)
            break
            
          default:
            break
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)
      
      const { user, session, error } = await authService.signIn(email, password)
      
      if (error) {
        setError(error)
        throw error
      }
      
      if (user && session) {
        setUser(user)
        setSession(session)
        
        // Redirect based on role
        const role = user.user_metadata?.role
        if (role === 'instructor' || role === 'admin') {
          router.push('/dashboard')
        } else {
          router.push('/my-courses')
        }
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  // Sign up
  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: SignUpMetadata
  ) => {
    try {
      setError(null)
      setLoading(true)
      
      const { user, session, error } = await authService.signUp(email, password, metadata)
      
      if (error) {
        setError(error)
        throw error
      }
      
      if (user && session) {
        setUser(user)
        setSession(session)
        router.push('/onboarding')
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      
      const { error } = await authService.signInWithProvider('google')
      
      if (error) {
        setError(error)
        throw error
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      
      const { error } = await authService.signOut()
      
      if (error) {
        setError(error)
        throw error
      }
      
      setUser(null)
      setSession(null)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    try {
      setError(null)
      setLoading(true)
      
      const { error } = await authService.resetPassword(email)
      
      if (error) {
        setError(error)
        throw error
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Update password
  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      setError(null)
      setLoading(true)
      
      const { error } = await authService.updatePassword(newPassword)
      
      if (error) {
        setError(error)
        throw error
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Refresh session
  const refreshSession = useCallback(async () => {
    try {
      const newSession = await authService.refreshSession()
      if (newSession) {
        setSession(newSession)
        setUser(newSession.user)
      }
    } catch (error) {
      console.error('Refresh session error:', error)
    }
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value: AuthContextValue = {
    user,
    session,
    loading,
    error,
    isAuthenticated,
    isStudent,
    isInstructor,
    isAdmin,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}