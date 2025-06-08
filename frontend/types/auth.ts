/**
 * Authentication Types
 * Centralized type definitions for the Supabase authentication system
 */

import type { User as SupabaseUser, Session } from '@supabase/supabase-js'

// =====================================================
// CORE TYPES
// =====================================================

/**
 * User role in the system
 */
export type UserRole = 'student' | 'instructor' | 'admin'

/**
 * Authentication provider types
 */
export type AuthProvider = 'email' | 'google' | 'microsoft'

/**
 * Authentication method types
 */
export type AuthMethod = 'password' | 'magic_link' | 'oauth'

// =====================================================
// USER PROFILE
// =====================================================

/**
 * User profile stored in public.profiles table
 */
export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  has_completed_onboarding: boolean
  created_at: string
  updated_at: string
}

/**
 * Extended user data combining Supabase user with profile
 */
export interface User extends SupabaseUser {
  profile: UserProfile | null
}

// =====================================================
// AUTHENTICATION RESULTS
// =====================================================

/**
 * Standard authentication result interface
 */
export interface AuthResult {
  success: boolean
  user?: User | null
  session?: Session | null
  error?: string | null
  needsEmailVerification?: boolean
  needsOnboarding?: boolean
}

/**
 * Sign-up specific result with additional metadata
 */
export interface SignUpResult extends AuthResult {
  needsEmailVerification: boolean
  confirmationSent: boolean
}

/**
 * Password reset result
 */
export interface PasswordResetResult {
  success: boolean
  error?: string | null
  emailSent: boolean
}

// =====================================================
// AUTHENTICATION INPUTS
// =====================================================

/**
 * Email/password sign-in credentials
 */
export interface SignInCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

/**
 * Sign-up form data
 */
export interface SignUpData {
  email: string
  password: string
  full_name: string
  terms_accepted: boolean
  newsletter_opt_in?: boolean
}

/**
 * Profile update data
 */
export interface ProfileUpdateData {
  full_name?: string
  avatar_url?: string
  role?: UserRole
  has_completed_onboarding?: boolean
}

/**
 * Password update data
 */
export interface PasswordUpdateData {
  current_password: string
  new_password: string
  confirm_password: string
}

// =====================================================
// CONTEXT STATE
// =====================================================

/**
 * Authentication context state
 */
export interface AuthState {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  initialized: boolean
}

/**
 * Authentication context methods
 */
export interface AuthActions {
  // Sign in/up methods
  signIn: (credentials: SignInCredentials) => Promise<AuthResult>
  signUp: (data: SignUpData) => Promise<SignUpResult>
  signInWithGoogle: () => Promise<AuthResult>
  signInWithMagicLink: (email: string) => Promise<AuthResult>
  
  // Account management
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<PasswordResetResult>
  updatePassword: (data: PasswordUpdateData) => Promise<AuthResult>
  updateProfile: (updates: ProfileUpdateData) => Promise<AuthResult>
  
  // Utility methods
  refreshSession: () => Promise<AuthResult>
  verifyOtp: (email: string, token: string, type: 'email' | 'sms') => Promise<AuthResult>
  resendConfirmation: (email: string) => Promise<{ success: boolean; error?: string }>
  
  // State management
  clearError: () => void
  setLoading: (loading: boolean) => void
}

/**
 * Complete authentication context type
 */
export interface AuthContextType extends AuthState, AuthActions {
  // Computed properties
  isAuthenticated: boolean
  needsOnboarding: boolean
  userRole: UserRole | null
  userName: string | null
  
  // Helper methods
  hasRole: (role: UserRole) => boolean
  isAdmin: () => boolean
  isInstructor: () => boolean
  isStudent: () => boolean
  getAuthToken: () => Promise<string | null>
}

// =====================================================
// AUDIT & SECURITY
// =====================================================

/**
 * Authentication event types for audit logging
 */
export type AuthEventType = 
  | 'signup'
  | 'login' 
  | 'logout'
  | 'password_reset'
  | 'profile_update'
  | 'role_change'
  | 'oauth_login'
  | 'magic_link_login'
  | 'email_verification'

/**
 * Authentication event data
 */
export interface AuthEvent {
  id: string
  user_id: string | null
  event_type: AuthEventType
  event_metadata: Record<string, any>
  ip_address?: string
  user_agent?: string
  success: boolean
  error_message?: string
  created_at: string
}

/**
 * Event metadata for different auth events
 */
export interface AuthEventMetadata {
  // Login events
  login?: {
    provider: AuthProvider
    method: AuthMethod
    remember_me?: boolean
  }
  
  // Signup events
  signup?: {
    provider: AuthProvider
    email_confirmed: boolean
    onboarding_completed: boolean
  }
  
  // Profile updates
  profile_update?: {
    fields_changed: string[]
    old_values?: Record<string, any>
    new_values?: Record<string, any>
  }
  
  // Role changes
  role_change?: {
    old_role: UserRole
    new_role: UserRole
    changed_by: string
  }
  
  // OAuth events
  oauth?: {
    provider: AuthProvider
    account_linked: boolean
    new_account: boolean
  }
}

// =====================================================
// HOOK OPTIONS & CONFIGURATION
// =====================================================

/**
 * Options for useAuth hook
 */
export interface UseAuthOptions {
  redirectTo?: string
  redirectIfAuthenticated?: boolean
  requireAuth?: boolean
  requiredRole?: UserRole
  onError?: (error: string) => void
  onSuccess?: (user: User) => void
}

/**
 * Route protection configuration
 */
export interface RouteProtection {
  requireAuth: boolean
  allowedRoles?: UserRole[]
  redirectTo?: string
  fallbackComponent?: React.ComponentType
}

// =====================================================
// FORM VALIDATION
// =====================================================

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string
  message: string
}

/**
 * Form validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

// =====================================================
// API ERROR TYPES
// =====================================================

/**
 * Supabase auth error codes we handle
 */
export type AuthErrorCode = 
  | 'email_not_confirmed'
  | 'invalid_credentials'
  | 'signup_disabled'
  | 'email_already_exists'
  | 'weak_password'
  | 'rate_limit_exceeded'
  | 'provider_email_needs_verification'
  | 'signup_requires_email'

/**
 * Structured auth error
 */
export interface AuthError {
  code: AuthErrorCode | string
  message: string
  details?: Record<string, any>
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Pagination for auth events
 */
export interface AuthEventsPagination {
  page: number
  limit: number
  total: number
  has_more: boolean
}

/**
 * Auth events query filters
 */
export interface AuthEventsFilter {
  user_id?: string
  event_type?: AuthEventType[]
  success?: boolean
  date_from?: string
  date_to?: string
}

/**
 * Auth metrics/analytics
 */
export interface AuthMetrics {
  total_users: number
  active_users_24h: number
  signup_rate_7d: number
  login_success_rate: number
  oauth_usage: Record<AuthProvider, number>
  role_distribution: Record<UserRole, number>
}