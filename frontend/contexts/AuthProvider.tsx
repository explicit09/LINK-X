'use client'

// Authentication System - Auth Provider Context
// Phase 2: Core Email Authentication
// File: contexts/AuthProvider.tsx

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import type {
  AuthContextState,
  AuthUser,
  UserProfile,
  SignUpData,
  SignInData,
  PasswordResetData,
  UpdateProfileData,
  AuthError,
  UserRole,
  Permission,
  AuthProviderProps,
} from '@/lib/auth/types'
import { DEFAULT_ROLE } from '@/lib/auth/types'
import authService from '@/lib/auth/authService'
import { debugLog, errorLog } from '@/lib/auth/config'

// Create the auth context
const AuthContext = createContext<AuthContextState | null>(null)

// Auth Provider Component
export function AuthProvider({ children, config }: AuthProviderProps) {
  // State management
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth()
  }, [])

  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = authService.onAuthStateChange(handleAuthStateChange)

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  /**
   * Initialize authentication state
   */
  const initializeAuth = async () => {
    try {
      debugLog('Initializing auth state')
      setLoading(true)
      setError(null)

      // Get current session
      const currentSession = await authService.getCurrentSession()
      
      if (currentSession?.user) {
        // Get current user with profile data
        const currentUser = await authService.getCurrentUser()
        
        if (currentUser) {
          setUser(currentUser)
          setSession(currentSession)
          setProfile(currentUser.profile || null)
          debugLog('Auth state initialized with user', { userId: currentUser.id })
        }
      } else {
        debugLog('No active session found')
      }
    } catch (err) {
      const authError = transformError(err)
      setError(authError)
      errorLog('Auth initialization failed', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle auth state changes from Supabase
   */
  const handleAuthStateChange = useCallback(async (newSession: Session | null) => {
    try {
      debugLog('Auth state change detected', { 
        hasSession: !!newSession,
        userId: newSession?.user?.id 
      })

      if (newSession?.user) {
        // User signed in - get enriched user data
        const enrichedUser = await authService.getCurrentUser()
        
        if (enrichedUser) {
          setUser(enrichedUser)
          setSession(newSession)
          setProfile(enrichedUser.profile || null)
          setError(null)
        }
      } else {
        // User signed out - clear state
        setUser(null)
        setSession(null)
        setProfile(null)
        setError(null)
      }
    } catch (err) {
      const authError = transformError(err)
      setError(authError)
      errorLog('Auth state change handling failed', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // =============================================================================
  // AUTHENTICATION METHODS
  // =============================================================================

  /**
   * Sign up a new user
   */
  const signUp = useCallback(async (data: SignUpData) => {
    try {
      setLoading(true)
      setError(null)
      debugLog('Sign up attempt', { email: data.email })

      const response = await authService.signUp(data)
      
      if (response.error) {
        setError(response.error)
        return response
      }

      // Update state if user is immediately available (email confirmed)
      if (response.user && response.session) {
        setUser(response.user)
        setSession(response.session)
        setProfile(response.user.profile || null)
      }

      return response
    } catch (err) {
      const authError = transformError(err)
      setError(authError)
      return { user: null, session: null, error: authError }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(async (data: SignInData) => {
    try {
      setLoading(true)
      setError(null)
      debugLog('Sign in attempt', { email: data.email })

      const response = await authService.signIn(data)
      
      if (response.error) {
        setError(response.error)
        return response
      }

      // State will be updated by auth state change listener
      return response
    } catch (err) {
      const authError = transformError(err)
      setError(authError)
      return { user: null, session: null, error: authError }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Sign in with Google OAuth
   */
  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      debugLog('Google OAuth sign in attempt')

      const response = await authService.signInWithGoogle()
      
      if (response.error) {
        setError(response.error)
      }

      return response
    } catch (err) {
      const authError = transformError(err)
      setError(authError)
      return { user: null, session: null, error: authError }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Sign in with magic link
   */
  const signInWithMagicLink = useCallback(async (email: string) => {
    try {
      setLoading(true)
      setError(null)
      debugLog('Magic link sign in attempt', { email })

      const response = await authService.signInWithMagicLink(email)
      
      if (response.error) {
        setError(response.error)
      }

      return response
    } catch (err) {
      const authError = transformError(err)
      setError(authError)
      return { user: null, session: null, error: authError }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Sign out current user
   */
  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      debugLog('Sign out attempt')

      await authService.signOut()
      
      // State will be cleared by auth state change listener
    } catch (err) {
      const authError = transformError(err)
      setError(authError)
      throw authError
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Reset password
   */
  const resetPassword = useCallback(async (data: PasswordResetData) => {
    try {
      setLoading(true)
      setError(null)
      debugLog('Password reset attempt', { email: data.email })

      await authService.resetPassword(data)
    } catch (err) {
      const authError = transformError(err)
      setError(authError)
      throw authError
    } finally {
      setLoading(false)
    }
  }, [])

  // =============================================================================
  // PROFILE METHODS
  // =============================================================================

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (data: UpdateProfileData): Promise<UserProfile | null> => {
    try {
      if (!user?.id) {
        throw new Error('No authenticated user')
      }

      setLoading(true)
      setError(null)
      debugLog('Profile update attempt', { userId: user.id })

      const updatedProfile = await authService.updateProfile(user.id, data)
      
      if (updatedProfile) {
        setProfile(updatedProfile)
        // Update user object with new profile data
        setUser(prev => prev ? { ...prev, profile: updatedProfile } : null)
      }

      return updatedProfile
    } catch (err) {
      const authError = transformError(err)
      setError(authError)
      throw authError
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  /**
   * Refresh user profile data
   */
  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      if (!user?.id) {
        return null
      }

      debugLog('Profile refresh attempt', { userId: user.id })

      const currentProfile = await authService.getUserProfile(user.id)
      
      if (currentProfile) {
        setProfile(currentProfile)
        setUser(prev => prev ? { ...prev, profile: currentProfile } : null)
      }

      return currentProfile
    } catch (err) {
      const authError = transformError(err)
      setError(authError)
      return null
    }
  }, [user?.id])

  // =============================================================================
  // PERMISSION METHODS
  // =============================================================================

  /**
   * Check if current user has specific permission
   */
  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false
    return authService.hasPermission(user, permission)
  }, [user])

  /**
   * Check if current user has specific role
   */
  const hasRole = useCallback((role: UserRole): boolean => {
    if (!user) return false
    return authService.hasRole(user, role)
  }, [user])

  /**
   * Check if current user has any of the specified roles
   */
  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    if (!user) return false
    return authService.hasAnyRole(user, roles)
  }, [user])

  /**
   * Check if current user can manage another user
   */
  const canManageUser = useCallback((userId: string): boolean => {
    if (!user) return false
    // User can manage themselves or admins can manage anyone
    return user.id === userId || hasRole('admin')
  }, [user, hasRole])

  // =============================================================================
  // SESSION METHODS
  // =============================================================================

  /**
   * Refresh current session
   */
  const refreshSession = useCallback(async () => {
    try {
      debugLog('Session refresh attempt')
      const newSession = await authService.refreshSession()
      
      if (newSession) {
        setSession(newSession)
      }

      return newSession
    } catch (err) {
      const authError = transformError(err)
      setError(authError)
      return null
    }
  }, [])

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // =============================================================================
  // COMPUTED PROPERTIES
  // =============================================================================

  const isAuthenticated = !!user && !!session
  const isLoading = loading
  const userRole: UserRole = user ? authService.getUserRole(user) : DEFAULT_ROLE

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: AuthContextState = {
    // State
    user,
    session,
    profile,
    loading,
    error,

    // Computed properties
    isAuthenticated,
    isLoading,
    userRole,

    // Authentication methods
    signUp,
    signIn,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
    resetPassword,

    // Profile methods
    updateProfile,
    refreshProfile,

    // Permission methods
    hasPermission,
    hasRole,
    hasAnyRole,
    canManageUser,

    // Session methods
    refreshSession,
    clearError,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Transform errors to our standard format
 */
function transformError(error: any): AuthError {
  const timestamp = new Date().toISOString()
  
  if (typeof error === 'string') {
    return { message: error, timestamp }
  }

  if (error?.message) {
    return {
      message: error.message,
      code: error.code,
      details: error,
      timestamp,
    }
  }

  return {
    message: 'An unexpected error occurred',
    details: error,
    timestamp,
  }
}

// =============================================================================
// HOOK FOR CONSUMING CONTEXT
// =============================================================================

/**
 * Hook to use auth context
 * Must be used within AuthProvider
 */
export function useAuthContext(): AuthContextState {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  
  return context
}

// Export the context for external use if needed
export { AuthContext }
export default AuthProvider