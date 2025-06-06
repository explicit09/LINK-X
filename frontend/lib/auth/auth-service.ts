/**
 * Authentication Service
 * Centralized auth logic that can be used anywhere in the app
 */
import { supabase } from './supabase-client'
import type { User, Session, AuthError } from '@supabase/supabase-js'

export interface AuthResponse {
  user: User | null
  session: Session | null
  error: AuthError | null
}

export interface SignUpMetadata {
  full_name?: string
  role?: 'student' | 'instructor' | 'admin'
  avatar_url?: string
}

export class AuthService {
  private static instance: AuthService

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Sign in error:', error)
        return { user: null, session: null, error }
      }

      // Update user metadata after successful login
      if (data.user) {
        await this.updateLastLogin(data.user.id)
      }

      return { user: data.user, session: data.session, error: null }
    } catch (error) {
      console.error('Unexpected sign in error:', error)
      return {
        user: null,
        session: null,
        error: error as AuthError,
      }
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(
    email: string,
    password: string,
    metadata?: SignUpMetadata
  ): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {},
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error('Sign up error:', error)
        return { user: null, session: null, error }
      }

      // Create user profile in backend
      if (data.user && data.session) {
        await this.createUserProfile(data.user, metadata)
      }

      return { user: data.user, session: data.session, error: null }
    } catch (error) {
      console.error('Unexpected sign up error:', error)
      return {
        user: null,
        session: null,
        error: error as AuthError,
      }
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithProvider(
    provider: 'google' | 'github' | 'microsoft'
  ): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: provider === 'google' ? 'email profile' : undefined,
        },
      })

      return { error }
    } catch (error) {
      console.error('OAuth sign in error:', error)
      return { error: error as AuthError }
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error: error as AuthError }
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      return { error }
    } catch (error) {
      console.error('Reset password error:', error)
      return { error: error as AuthError }
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      return { error }
    } catch (error) {
      console.error('Update password error:', error)
      return { error: error as AuthError }
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    try {
      const { data } = await supabase.auth.getSession()
      return data.session
    } catch (error) {
      console.error('Get session error:', error)
      return null
    }
  }

  /**
   * Get current user
   */
  async getUser(): Promise<User | null> {
    try {
      const { data } = await supabase.auth.getUser()
      return data.user
    } catch (error) {
      console.error('Get user error:', error)
      return null
    }
  }

  /**
   * Refresh session
   */
  async refreshSession(): Promise<Session | null> {
    try {
      const { data } = await supabase.auth.refreshSession()
      return data.session
    } catch (error) {
      console.error('Refresh session error:', error)
      return null
    }
  }

  /**
   * Update user metadata
   */
  async updateUserMetadata(metadata: Record<string, any>): Promise<{
    user: User | null
    error: AuthError | null
  }> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: metadata,
      })

      return { user: data.user, error }
    } catch (error) {
      console.error('Update metadata error:', error)
      return { user: null, error: error as AuthError }
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(email: string, token: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })

      return { user: data.user, session: data.session, error }
    } catch (error) {
      console.error('Verify OTP error:', error)
      return {
        user: null,
        session: null,
        error: error as AuthError,
      }
    }
  }

  /**
   * Private: Create user profile in backend
   */
  private async createUserProfile(user: User, metadata?: SignUpMetadata) {
    try {
      const session = await this.getSession()
      if (!session) return

      const response = await fetch('/api/v2/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email,
          ...metadata,
        }),
      })

      if (!response.ok) {
        console.error('Failed to create user profile:', await response.text())
      }
    } catch (error) {
      console.error('Create profile error:', error)
    }
  }

  /**
   * Private: Update last login
   */
  private async updateLastLogin(userId: string) {
    try {
      const session = await this.getSession()
      if (!session) return

      await fetch('/api/v2/auth/last-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      })
    } catch (error) {
      console.error('Update last login error:', error)
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance()