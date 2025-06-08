// Authentication System - Core Auth Service
// Phase 2: Core Email Authentication
// File: lib/auth/authService.ts

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  AuthResponse,
  AuthUser,
  UserProfile,
  SignUpData,
  SignInData,
  PasswordResetData,
  UpdateProfileData,
  AuthError,
  AuthEventType,
  UserRole,
  Permission,
} from './types'
import { ROLE_PERMISSIONS } from './types'
import { 
  authConfig, 
  AUTH_CONSTANTS, 
  debugLog, 
  errorLog 
} from './config'

class AuthService {
  private supabase: SupabaseClient
  private static instance: AuthService | null = null

  private constructor() {
    this.supabase = createClient(
      authConfig.supabase.url,
      authConfig.supabase.anonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          storageKey: AUTH_CONSTANTS.STORAGE_KEYS.SESSION,
          flowType: 'implicit',
        },
        global: {
          headers: {
            'x-client-info': 'learn-x-auth@1.0.0',
          },
        },
      }
    )

    debugLog('AuthService initialized')
  }

  // Singleton pattern
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  // Get Supabase client instance
  public getClient(): SupabaseClient {
    return this.supabase
  }

  // =============================================================================
  // AUTHENTICATION METHODS
  // =============================================================================

  /**
   * Sign up a new user with email and password
   */
  async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      debugLog('Attempting sign up', { email: data.email })

      const { data: authData, error } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name || '',
            ...data.metadata,
          },
        },
      })

      if (error) {
        const authError = this.transformError(error)
        await this.logAuthEvent(null, 'sign_up', { 
          email: data.email,
          success: false,
          error: authError.message 
        })
        return { user: null, session: null, error: authError }
      }

      const user = authData.user ? await this.enrichUser(authData.user) : null
      
      // Log successful sign up
      await this.logAuthEvent(
        authData.user?.id || null, 
        'sign_up', 
        { 
          email: data.email,
          confirmed: authData.user?.email_confirmed_at !== null
        }
      )

      debugLog('Sign up successful', { user: user?.id })
      return { user, session: authData.session, error: null }
    } catch (err) {
      const error = this.transformError(err)
      errorLog('Sign up failed', err)
      return { user: null, session: null, error }
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(data: SignInData): Promise<AuthResponse> {
    try {
      debugLog('Attempting sign in', { email: data.email })

      const { data: authData, error } = await this.supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        const authError = this.transformError(error)
        await this.logAuthEvent(null, 'failed_login', { 
          email: data.email,
          error: authError.message 
        })
        return { user: null, session: null, error: authError }
      }

      const user = authData.user ? await this.enrichUser(authData.user) : null
      
      // Log successful sign in
      await this.logAuthEvent(
        authData.user?.id || null, 
        'sign_in', 
        { 
          email: data.email,
          method: 'password'
        }
      )

      debugLog('Sign in successful', { user: user?.id })
      return { user, session: authData.session, error: null }
    } catch (err) {
      const error = this.transformError(err)
      errorLog('Sign in failed', err)
      return { user: null, session: null, error }
    }
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(): Promise<AuthResponse> {
    try {
      debugLog('Attempting Google OAuth sign in')

      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: authConfig.oauth.redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        const authError = this.transformError(error)
        await this.logAuthEvent(null, 'failed_login', { 
          method: 'google',
          error: authError.message 
        })
        return { user: null, session: null, error: authError }
      }

      debugLog('Google OAuth redirect initiated')
      // OAuth redirects, so we return success without user data
      return { user: null, session: null, error: null }
    } catch (err) {
      const error = this.transformError(err)
      errorLog('Google OAuth failed', err)
      return { user: null, session: null, error }
    }
  }

  /**
   * Sign in with magic link
   */
  async signInWithMagicLink(email: string): Promise<AuthResponse> {
    try {
      debugLog('Sending magic link', { email })

      const { data, error } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: authConfig.oauth.redirectUrl,
        },
      })

      if (error) {
        const authError = this.transformError(error)
        return { user: null, session: null, error: authError }
      }

      debugLog('Magic link sent successfully')
      return { user: null, session: null, error: null }
    } catch (err) {
      const error = this.transformError(err)
      errorLog('Magic link failed', err)
      return { user: null, session: null, error }
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      const currentUser = await this.getCurrentUser()
      debugLog('Attempting sign out', { user: currentUser?.id })

      const { error } = await this.supabase.auth.signOut()

      if (error) {
        throw error
      }

      // Log sign out event
      await this.logAuthEvent(
        currentUser?.id || null, 
        'sign_out', 
        { method: 'manual' }
      )

      debugLog('Sign out successful')
    } catch (err) {
      errorLog('Sign out failed', err)
      throw this.transformError(err)
    }
  }

  /**
   * Reset password
   */
  async resetPassword(data: PasswordResetData): Promise<void> {
    try {
      debugLog('Sending password reset', { email: data.email })

      const { error } = await this.supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${authConfig.oauth.redirectUrl}?type=recovery`,
      })

      if (error) {
        throw error
      }

      // Log password reset request
      await this.logAuthEvent(null, 'password_reset', { 
        email: data.email 
      })

      debugLog('Password reset email sent')
    } catch (err) {
      errorLog('Password reset failed', err)
      throw this.transformError(err)
    }
  }

  // =============================================================================
  // SESSION MANAGEMENT
  // =============================================================================

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser()
      
      if (error || !user) {
        return null
      }

      return await this.enrichUser(user)
    } catch (err) {
      errorLog('Get current user failed', err)
      return null
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession()
      
      if (error) {
        throw error
      }

      return session
    } catch (err) {
      errorLog('Get current session failed', err)
      return null
    }
  }

  /**
   * Refresh current session
   */
  async refreshSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.refreshSession()
      
      if (error) {
        throw error
      }

      debugLog('Session refreshed successfully')
      return session
    } catch (err) {
      errorLog('Session refresh failed', err)
      return null
    }
  }

  // =============================================================================
  // PROFILE MANAGEMENT
  // =============================================================================

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (err) {
      errorLog('Get user profile failed', err)
      return null
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateProfileData): Promise<UserProfile | null> {
    try {
      debugLog('Updating profile', { userId, data })

      const { data: profile, error } = await this.supabase
        .from('profiles')
        .update(data)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        throw error
      }

      debugLog('Profile updated successfully')
      return profile
    } catch (err) {
      errorLog('Update profile failed', err)
      throw this.transformError(err)
    }
  }

  // =============================================================================
  // PERMISSION & ROLE MANAGEMENT
  // =============================================================================

  /**
   * Get user role from user data
   */
  getUserRole(user: AuthUser): UserRole {
    return user.app_metadata?.role || user.profile?.role || 'student'
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(user: AuthUser, permission: Permission): boolean {
    const role = this.getUserRole(user)
    return ROLE_PERMISSIONS[role]?.includes(permission) || false
  }

  /**
   * Check if user has specific role
   */
  hasRole(user: AuthUser, role: UserRole): boolean {
    return this.getUserRole(user) === role
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(user: AuthUser, roles: UserRole[]): boolean {
    const userRole = this.getUserRole(user)
    return roles.includes(userRole)
  }

  // =============================================================================
  // AUTH STATE LISTENING
  // =============================================================================

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (session: any) => void) {
    return this.supabase.auth.onAuthStateChange(async (event, session) => {
      debugLog(`Auth state changed: ${event}`)
      
      // Log auth events
      if (event === 'SIGNED_IN' && session?.user) {
        await this.logAuthEvent(session.user.id, 'sign_in', { 
          method: 'session_recovery' 
        })
      } else if (event === 'SIGNED_OUT') {
        await this.logAuthEvent(null, 'sign_out', { 
          method: 'session_expired' 
        })
      }

      callback(session)
    })
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Enrich user object with profile data
   */
  private async enrichUser(user: any): Promise<AuthUser> {
    const profile = await this.getUserProfile(user.id)
    
    return {
      ...user,
      role: user.app_metadata?.role || profile?.role || 'student',
      profile,
    }
  }

  /**
   * Transform Supabase errors to our error format
   */
  private transformError(error: any): AuthError {
    const timestamp = new Date().toISOString()
    
    if (typeof error === 'string') {
      return { message: error, timestamp }
    }

    if (error?.message) {
      return {
        message: error.message,
        code: error.code || error.status?.toString(),
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

  /**
   * Log authentication events for audit trail
   */
  private async logAuthEvent(
    userId: string | null,
    eventType: AuthEventType,
    details: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Get client info
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : undefined
      
      await this.supabase.rpc('log_auth_event', {
        p_user_id: userId,
        p_event_type: eventType,
        p_event_details: details,
        p_user_agent: userAgent,
        p_success: !details.error,
        p_error_message: details.error || null,
      })
    } catch (err) {
      // Don't throw on logging errors, just log them
      errorLog('Failed to log auth event', err)
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance()
export default authService