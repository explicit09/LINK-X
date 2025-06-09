'use client'

/**
 * NO AUTH CONTEXT
 * Provides mock user data without any authentication
 * All auth methods are no-ops
 */

import React, { createContext, useContext } from 'react'

// Minimal user type
interface User {
  id: string
  email: string
  name: string
}

interface NoAuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  error: null
  profile: {
    id: string
    email: string
    name: string
    role: 'student'
    has_completed_onboarding: boolean
  } | null
  userName: string
  needsOnboarding: boolean
  
  // No-op auth methods for compatibility
  signIn: () => Promise<{ error: null }>
  signUp: () => Promise<{ error: null }>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<{ error: null }>
  clearError: () => void
  register: () => Promise<{ error: null }>
  getAuthToken: () => Promise<string>
}

// Default user data
const DEFAULT_USER: User = {
  id: 'default-user',
  email: 'user@example.com',
  name: 'Default User'
}

const NoAuthContext = createContext<NoAuthContextType | undefined>(undefined)

export function NoAuthProvider({ children }: { children: React.ReactNode }) {
  // Default profile data
  const profile = {
    id: DEFAULT_USER.id,
    email: DEFAULT_USER.email,
    name: DEFAULT_USER.name,
    role: 'student' as const,
    has_completed_onboarding: true
  }

  // All auth methods do nothing
  const value: NoAuthContextType = {
    user: DEFAULT_USER,
    isAuthenticated: true,
    loading: false,
    error: null,
    profile,
    userName: DEFAULT_USER.name,
    needsOnboarding: false,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => {},
    signInWithGoogle: async () => ({ error: null }),
    clearError: () => {},
    register: async () => ({ error: null }),
    getAuthToken: async () => 'mock-token'
  }

  return <NoAuthContext.Provider value={value}>{children}</NoAuthContext.Provider>
}

export function useNoAuth() {
  const context = useContext(NoAuthContext)
  if (!context) {
    throw new Error('useNoAuth must be used within NoAuthProvider')
  }
  return context
}