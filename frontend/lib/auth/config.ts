// Authentication System - Configuration
// Phase 2: Core Email Authentication
// File: lib/auth/config.ts

import type { AuthConfig } from './types'

// Environment variable validation
const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const

// Validate required environment variables
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
}

// Get site URL with fallback
const getSiteUrl = (): string => {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  return 'http://localhost:3000'
}

// Main authentication configuration
export const authConfig: AuthConfig = {
  supabase: {
    url: requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: requiredEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  oauth: {
    redirectUrl: `${getSiteUrl()}/auth/callback`,
  },
  session: {
    refreshThreshold: 300, // 5 minutes in seconds
    maxRetries: 3,
  },
  routes: {
    login: '/login',
    signup: '/signup',
    dashboard: '/dashboard',
    unauthorized: '/unauthorized',
  },
}

// Auth-related constants
export const AUTH_CONSTANTS = {
  // Storage keys
  STORAGE_KEYS: {
    SESSION: 'sb-auth-token',
    USER_PREFERENCES: 'user-preferences',
    LAST_ROUTE: 'last-route',
  },
  
  // Session settings
  SESSION: {
    REFRESH_THRESHOLD: 300, // 5 minutes
    MAX_AGE: 3600, // 1 hour
    REMEMBER_ME_DURATION: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Rate limiting
  RATE_LIMITS: {
    LOGIN_ATTEMPTS: 5,
    LOGIN_WINDOW: 15 * 60, // 15 minutes
    PASSWORD_RESET: 3,
    PASSWORD_RESET_WINDOW: 60 * 60, // 1 hour
  },
  
  // Validation rules
  VALIDATION: {
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
    EMAIL_MAX_LENGTH: 254,
    NAME_MAX_LENGTH: 100,
    NAME_MIN_LENGTH: 2,
  },
  
  // Error codes
  ERROR_CODES: {
    INVALID_CREDENTIALS: 'invalid_credentials',
    EMAIL_NOT_CONFIRMED: 'email_not_confirmed',
    TOO_MANY_REQUESTS: 'too_many_requests',
    WEAK_PASSWORD: 'weak_password',
    SIGNUP_DISABLED: 'signup_disabled',
    INVALID_EMAIL: 'invalid_email',
    USER_NOT_FOUND: 'user_not_found',
    SESSION_EXPIRED: 'session_expired',
    PERMISSION_DENIED: 'permission_denied',
  },
  
  // Event types for audit logging
  EVENTS: {
    SIGN_UP: 'sign_up',
    SIGN_IN: 'sign_in',
    SIGN_OUT: 'sign_out',
    PASSWORD_RESET: 'password_reset',
    EMAIL_CONFIRMATION: 'email_confirmation',
    ROLE_CHANGE: 'role_change',
    FAILED_LOGIN: 'failed_login',
    ACCOUNT_LOCKED: 'account_locked',
  } as const,
  
  // OAuth providers
  OAUTH_PROVIDERS: {
    GOOGLE: 'google',
    GITHUB: 'github',
    APPLE: 'apple',
    FACEBOOK: 'facebook',
  } as const,
  
  // Default metadata for new users
  DEFAULT_USER_METADATA: {
    theme: 'light',
    language: 'en',
    notifications: true,
    marketing_emails: false,
  },
} as const

// Password validation rules
export const PASSWORD_RULES = {
  minLength: AUTH_CONSTANTS.VALIDATION.PASSWORD_MIN_LENGTH,
  maxLength: AUTH_CONSTANTS.VALIDATION.PASSWORD_MAX_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false, // Set to true for stricter requirements
  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
} as const

// Email validation
export const EMAIL_RULES = {
  maxLength: AUTH_CONSTANTS.VALIDATION.EMAIL_MAX_LENGTH,
  pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
} as const

// Name validation
export const NAME_RULES = {
  minLength: AUTH_CONSTANTS.VALIDATION.NAME_MIN_LENGTH,
  maxLength: AUTH_CONSTANTS.VALIDATION.NAME_MAX_LENGTH,
  pattern: /^[a-zA-Z\s'-]+$/,
} as const

// Feature flags for auth system
export const AUTH_FEATURES = {
  MAGIC_LINK: true,
  OAUTH_GOOGLE: true,
  OAUTH_GITHUB: false,
  OAUTH_APPLE: false,
  OAUTH_FACEBOOK: false,
  MFA_TOTP: true,
  REMEMBER_ME: true,
  PASSWORD_STRENGTH_METER: true,
  EMAIL_VERIFICATION_REQUIRED: true,
  AUDIT_LOGGING: true,
  RATE_LIMITING: true,
} as const

// Development helpers
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isProduction = process.env.NODE_ENV === 'production'

// Debug logging helper
export const debugLog = (message: string, data?: any) => {
  if (isDevelopment) {
    console.log(`[Auth Debug] ${message}`, data || '')
  }
}

// Error logging helper
export const errorLog = (message: string, error?: any) => {
  if (isDevelopment) {
    console.error(`[Auth Error] ${message}`, error || '')
  }
}

// Export individual config sections for convenience
export const supabaseConfig = authConfig.supabase
export const oauthConfig = authConfig.oauth
export const sessionConfig = authConfig.session
export const routeConfig = authConfig.routes

// Type exports for external use
export type { AuthConfig } from './types'