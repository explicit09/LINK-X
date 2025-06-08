/**
 * Authentication Service
 * Centralized service for all authentication operations with Supabase
 * 
 * This service abstracts Supabase auth operations and provides:
 * - Typed interfaces for all auth methods
 * - Error handling and normalization
 * - Audit logging integration
 * - Profile management
 * - Session management
 */

import { createClient } from '@/lib/supabase/client'
import type {
  User,
  UserProfile,
  AuthResult,
  SignUpResult,
  PasswordResetResult,
  SignInCredentials,
  SignUpData,
  ProfileUpdateData,
  PasswordUpdateData,
  AuthEventType,
  AuthError,
  UserRole
} from '@/types/auth'
import type { SupabaseClient } from '@supabase/supabase-js'

class AuthService {
  private supabase: SupabaseClient

  constructor() {
    this.supabase = createClient()
  }

  // =====================================================
  // SIGN UP METHODS
  // =====================================================

  /**
   * Sign up with email and password
   */
  async signUp(data: SignUpData): Promise<SignUpResult> {
    try {
      const { email, password, full_name, terms_accepted } = data

      if (!terms_accepted) {
        return {
          success: false,
          error: 'You must accept the terms and conditions',
          needsEmailVerification: false,
          confirmationSent: false
        }
      }

      const { data: authData, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
            newsletter_opt_in: data.newsletter_opt_in || false
          }
        }
      })

      if (error) {
        await this.logAuthEvent('signup', null, { 
          provider: 'email',
          success: false,
          error_message: error.message 
        })
        
        return {
          success: false,
          error: this.normalizeAuthError(error),
          needsEmailVerification: false,
          confirmationSent: false
        }
      }

      // Check if email confirmation is needed
      const needsVerification = !authData.user?.email_confirmed_at
      
      await this.logAuthEvent('signup', authData.user?.id || null, {
        provider: 'email',
        success: true,
        email_confirmed: !needsVerification,
        full_name
      })

      return {
        success: true,
        user: await this.enrichUserWithProfile(authData.user),
        session: authData.session,
        needsEmailVerification: needsVerification,
        confirmationSent: needsVerification,
        needsOnboarding: true
      }
    } catch (error) {
      console.error('SignUp error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred during sign up',
        needsEmailVerification: false,
        confirmationSent: false
      }
    }
  }

  // =====================================================
  // SIGN IN METHODS
  // =====================================================

  /**
   * Sign in with email and password
   */
  async signIn(credentials: SignInCredentials): Promise<AuthResult> {
    try {
      const { email, password } = credentials

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        await this.logAuthEvent('login', null, {
          provider: 'email',
          method: 'password',
          success: false,
          error_message: error.message
        })

        return {
          success: false,
          error: this.normalizeAuthError(error)
        }
      }

      const enrichedUser = await this.enrichUserWithProfile(data.user)
      
      await this.logAuthEvent('login', data.user?.id || null, {
        provider: 'email',
        method: 'password',
        success: true,
        remember_me: credentials.rememberMe
      })

      return {
        success: true,
        user: enrichedUser,
        session: data.session,
        needsOnboarding: !enrichedUser?.profile?.has_completed_onboarding
      }
    } catch (error) {
      console.error('SignIn error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred during sign in'
      }
    }
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        await this.logAuthEvent('oauth_login', null, {
          provider: 'google',
          success: false,
          error_message: error.message
        })

        return {
          success: false,
          error: this.normalizeAuthError(error)
        }
      }

      // OAuth redirects, so we return success but without user data
      // The actual user data will be available after the redirect
      return {
        success: true,
        user: null,
        session: null
      }
    } catch (error) {
      console.error('Google OAuth error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred during Google sign in'
      }
    }
  }

  /**
   * Sign in with magic link
   */
  async signInWithMagicLink(email: string): Promise<AuthResult> {
    try {
      const { error } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        await this.logAuthEvent('magic_link_login', null, {
          provider: 'email',
          method: 'magic_link',
          success: false,
          error_message: error.message
        })

        return {
          success: false,
          error: this.normalizeAuthError(error)
        }
      }

      await this.logAuthEvent('magic_link_login', null, {
        provider: 'email',
        method: 'magic_link',
        success: true,
        email
      })

      return {
        success: true,
        user: null,
        session: null
      }
    } catch (error) {
      console.error('Magic link error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred while sending magic link'
      }
    }
  }

  // =====================================================
  // SESSION MANAGEMENT
  // =====================================================

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      
      const { error } = await this.supabase.auth.signOut()
      
      if (!error && user) {
        await this.logAuthEvent('logout', user.id, {
          success: true
        })
      }
      
      if (error) {
        console.error('Sign out error:', error)
      }
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  /**
   * Get current session
   */
  async getSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession()
      if (error) throw error
      return session
    } catch (error) {
      console.error('Get session error:', error)
      return null
    }
  }

  /**
   * Get current user with profile
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser()
      if (error) throw error
      return user ? await this.enrichUserWithProfile(user) : null
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  /**
   * Refresh current session
   */
  async refreshSession(): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession()
      
      if (error) {
        return {
          success: false,
          error: this.normalizeAuthError(error)
        }
      }

      return {
        success: true,
        user: data.user ? await this.enrichUserWithProfile(data.user) : null,
        session: data.session
      }
    } catch (error) {
      console.error('Refresh session error:', error)
      return {
        success: false,
        error: 'Failed to refresh session'
      }
    }
  }

  // =====================================================
  // PASSWORD MANAGEMENT
  // =====================================================

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<PasswordResetResult> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) {
        await this.logAuthEvent('password_reset', null, {
          success: false,
          error_message: error.message,
          email
        })

        return {
          success: false,
          error: this.normalizeAuthError(error),
          emailSent: false
        }
      }

      await this.logAuthEvent('password_reset', null, {
        success: true,
        email
      })

      return {
        success: true,
        emailSent: true
      }
    } catch (error) {
      console.error('Reset password error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred while resetting password',
        emailSent: false
      }
    }
  }

  /**
   * Update password
   */
  async updatePassword(data: PasswordUpdateData): Promise<AuthResult> {
    try {
      // Verify current password by trying to sign in
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user?.email) {
        return {
          success: false,
          error: 'No authenticated user found'
        }
      }

      // Update password
      const { error } = await this.supabase.auth.updateUser({
        password: data.new_password
      })

      if (error) {
        return {
          success: false,
          error: this.normalizeAuthError(error)
        }
      }

      await this.logAuthEvent('password_reset', user.id, {
        success: true,
        type: 'password_update'
      })

      return {
        success: true,
        user: await this.enrichUserWithProfile(user)
      }
    } catch (error) {
      console.error('Update password error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred while updating password'
      }
    }
  }

  // =====================================================
  // PROFILE MANAGEMENT
  // =====================================================

  /**
   * Update user profile
   */
  async updateProfile(updates: ProfileUpdateData): Promise<AuthResult> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        return {
          success: false,
          error: 'No authenticated user found'
        }
      }

      // Update profile in profiles table
      const { data, error } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: `Failed to update profile: ${error.message}`
        }
      }

      // Update user metadata if name changed
      if (updates.full_name) {
        await this.supabase.auth.updateUser({
          data: { full_name: updates.full_name }
        })
      }

      await this.logAuthEvent('profile_update', user.id, {
        success: true,
        fields_changed: Object.keys(updates),
        new_values: updates
      })

      return {
        success: true,
        user: await this.enrichUserWithProfile(user)
      }
    } catch (error) {
      console.error('Update profile error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred while updating profile'
      }
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Get user profile error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Get user profile error:', error)
      return null
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Verify OTP token
   */
  async verifyOtp(email: string, token: string, type: 'email' | 'sms'): Promise<AuthResult> {
    try {
      let data, error
      
      if (type === 'email') {
        ({ data, error } = await this.supabase.auth.verifyOtp({
          email,
          token,
          type: 'signup'
        }))
      } else {
        // For SMS/phone verification, use phone parameter
        ({ data, error } = await this.supabase.auth.verifyOtp({
          phone: email, // In this case, email parameter contains phone number
          token,
          type: 'sms'
        }))
      }

      if (error) {
        return {
          success: false,
          error: this.normalizeAuthError(error)
        }
      }

      await this.logAuthEvent('email_verification', data.user?.id || null, {
        success: true,
        verification_type: type
      })

      return {
        success: true,
        user: data.user ? await this.enrichUserWithProfile(data.user) : null,
        session: data.session
      }
    } catch (error) {
      console.error('Verify OTP error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred during verification'
      }
    }
  }

  /**
   * Resend confirmation email
   */
  async resendConfirmation(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.resend({
        type: 'signup',
        email
      })

      if (error) {
        return {
          success: false,
          error: this.normalizeAuthError(error)
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Resend confirmation error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred while resending confirmation'
      }
    }
  }

  /**
   * Get auth token for API requests
   */
  async getAuthToken(): Promise<string | null> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession()
      return session?.access_token || null
    } catch (error) {
      console.error('Get auth token error:', error)
      return null
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  /**
   * Enrich Supabase user with profile data
   */
  private async enrichUserWithProfile(user: any): Promise<User | null> {
    if (!user) return null

    try {
      const profile = await this.getUserProfile(user.id)
      return {
        ...user,
        profile
      } as User
    } catch (error) {
      console.error('Enrich user with profile error:', error)
      return {
        ...user,
        profile: null
      } as User
    }
  }

  /**
   * Log authentication events for audit trail
   */
  private async logAuthEvent(
    eventType: AuthEventType,
    userId: string | null,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Get client info
      const userAgent = navigator.userAgent
      const success = metadata.success !== false

      await this.supabase.rpc('log_auth_event', {
        p_user_id: userId,
        p_event_type: eventType,
        p_metadata: metadata,
        p_user_agent: userAgent,
        p_success: success,
        p_error_message: metadata.error_message || null
      })
    } catch (error) {
      // Don't throw on audit log failures
      console.warn('Failed to log auth event:', error)
    }
  }

  /**
   * Normalize Supabase auth errors to user-friendly messages
   */
  private normalizeAuthError(error: any): string {
    const errorMessage = error?.message || 'An unknown error occurred'
    
    // Map common Supabase auth errors to user-friendly messages
    const errorMappings: Record<string, string> = {
      'Invalid login credentials': 'Invalid email or password',
      'Email not confirmed': 'Please check your email and click the confirmation link',
      'User already registered': 'An account with this email already exists',
      'Password should be at least 6 characters': 'Password must be at least 6 characters long',
      'Signup requires a valid password': 'Please enter a valid password',
      'Unable to validate email address: invalid format': 'Please enter a valid email address',
      'Rate limit exceeded': 'Too many attempts. Please try again later'
    }

    return errorMappings[errorMessage] || errorMessage
  }
}

// Export singleton instance
export const authService = new AuthService()
export default authService