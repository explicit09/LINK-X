// Authentication System - TypeScript Types
// Phase 2: Core Email Authentication
// File: lib/auth/types.ts

import type { User, Session, AuthError as SupabaseAuthError } from '@supabase/supabase-js'

// User role enumeration matching database enum
export type UserRole = 'student' | 'instructor' | 'admin'

// Extended user interface with profile data
export interface AuthUser extends User {
  role?: UserRole
  profile?: UserProfile
}

// User profile interface matching database schema
export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  role: UserRole
  created_at: string
  updated_at: string
}

// Enhanced auth error interface
export interface AuthError {
  message: string
  code?: string
  details?: any
  timestamp?: string
}

// Authentication event types for audit logging
export type AuthEventType = 
  | 'sign_up'
  | 'sign_in' 
  | 'sign_out'
  | 'password_reset'
  | 'email_confirmation'
  | 'role_change'
  | 'failed_login'
  | 'account_locked'

// Auth event for audit logging
export interface AuthEvent {
  id?: string
  user_id?: string
  event_type: AuthEventType
  event_details?: Record<string, any>
  ip_address?: string
  user_agent?: string
  session_id?: string
  success?: boolean
  error_message?: string
  created_at?: string
}

// Authentication response type
export interface AuthResponse {
  user: AuthUser | null
  session: Session | null
  error: AuthError | null
}

// Sign up data interface
export interface SignUpData {
  email: string
  password: string
  full_name?: string
  metadata?: Record<string, any>
}

// Sign in data interface
export interface SignInData {
  email: string
  password: string
}

// Password reset data
export interface PasswordResetData {
  email: string
}

// Update profile data
export interface UpdateProfileData {
  full_name?: string
  avatar_url?: string
}

// Permission checking
export type Permission = 
  | 'profile:read'
  | 'profile:update'
  | 'profile:delete'
  | 'users:read'
  | 'users:manage'
  | 'courses:read'
  | 'courses:create'
  | 'courses:update'
  | 'courses:delete'
  | 'admin:access'
  | 'audit:read'

// Role permission matrix type
export type RolePermissions = {
  [K in UserRole]: Permission[]
}

// Auth context state interface
export interface AuthContextState {
  // State
  user: AuthUser | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  error: AuthError | null
  
  // Computed properties
  isAuthenticated: boolean
  isLoading: boolean
  userRole: UserRole
  
  // Authentication methods
  signUp: (data: SignUpData) => Promise<AuthResponse>
  signIn: (data: SignInData) => Promise<AuthResponse>
  signInWithGoogle: () => Promise<AuthResponse>
  signInWithMagicLink: (email: string) => Promise<AuthResponse>
  signOut: () => Promise<void>
  resetPassword: (data: PasswordResetData) => Promise<void>
  
  // Profile methods
  updateProfile: (data: UpdateProfileData) => Promise<UserProfile | null>
  refreshProfile: () => Promise<UserProfile | null>
  
  // Permission methods
  hasPermission: (permission: Permission) => boolean
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
  canManageUser: (userId: string) => boolean
  
  // Session methods
  refreshSession: () => Promise<Session | null>
  clearError: () => void
}

// Auth service configuration
export interface AuthConfig {
  supabase: {
    url: string
    anonKey: string
  }
  oauth: {
    redirectUrl: string
  }
  session: {
    refreshThreshold: number // seconds before expiry to refresh
    maxRetries: number
  }
  routes: {
    login: string
    signup: string
    dashboard: string
    unauthorized: string
  }
}

// OAuth provider type
export type OAuthProvider = 'google' | 'github' | 'apple' | 'facebook'

// OAuth sign in options
export interface OAuthSignInOptions {
  provider: OAuthProvider
  redirectTo?: string
  scopes?: string
  queryParams?: Record<string, string>
}

// Validation error interface
export interface ValidationError {
  field: string
  message: string
  code?: string
}

// Form validation result
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

// Auth hook options
export interface UseAuthOptions {
  redirectTo?: string
  required?: boolean
  loadProfile?: boolean
}

// Auth guard options
export interface AuthGuardOptions {
  redirectTo?: string
  requiredRole?: UserRole
  requiredPermission?: Permission
  fallback?: React.ComponentType
}

// Utility type for async state
export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: AuthError | null
}

// Auth provider props
export interface AuthProviderProps {
  children: React.ReactNode
  config?: Partial<AuthConfig>
}

// Export Supabase types for convenience
export type { User, Session, SupabaseAuthError }

// Constants for default values
export const DEFAULT_ROLE: UserRole = 'student'

export const ROLE_HIERARCHY: UserRole[] = ['student', 'instructor', 'admin']

// Permission definitions
export const ROLE_PERMISSIONS: RolePermissions = {
  student: [
    'profile:read',
    'profile:update',
    'courses:read'
  ],
  instructor: [
    'profile:read',
    'profile:update',
    'courses:read',
    'courses:create',
    'courses:update',
    'users:read'
  ],
  admin: [
    'profile:read',
    'profile:update',
    'profile:delete',
    'users:read',
    'users:manage',
    'courses:read',
    'courses:create',
    'courses:update',
    'courses:delete',
    'admin:access',
    'audit:read'
  ]
}