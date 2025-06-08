// Authentication System - Auth Guard Hook
// Phase 2: Core Email Authentication
// File: hooks/useAuthGuard.ts

'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './useAuth'
import type { UserRole, Permission, AuthGuardOptions } from '@/lib/auth/types'
import { USER_JOURNEY_ROUTES } from '@/lib/auth/types'
import { routeConfig } from '@/lib/auth/config'

/**
 * Enhanced authentication guard hook with onboarding support
 * 
 * This hook implements the complete user journey:
 * 1. Unauthenticated users -> redirect to login
 * 2. Authenticated but no onboarding -> redirect to onboarding
 * 3. Authenticated + onboarded -> allow access (with role/permission checks)
 */
export const useAuthGuard = (options: AuthGuardOptions = {}) => {
  const {
    redirectTo,
    requiredRole,
    requiredPermission,
    requireOnboarding = true, // Default to requiring onboarding
  } = options

  const router = useRouter()
  const pathname = usePathname()
  const { 
    isAuthenticated, 
    isLoading, 
    needsOnboarding, 
    hasRole, 
    hasPermission,
    userRole 
  } = useAuth()

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return

    // If not authenticated, redirect to login with return URL
    if (!isAuthenticated) {
      const loginUrl = `${USER_JOURNEY_ROUTES.LOGIN}?returnTo=${encodeURIComponent(pathname)}`
      router.push(redirectTo || loginUrl)
      return
    }

    // If authenticated but needs onboarding and onboarding is required
    if (requireOnboarding && needsOnboarding) {
      // Don't redirect if already on onboarding page
      if (pathname !== USER_JOURNEY_ROUTES.ONBOARDING) {
        router.push(USER_JOURNEY_ROUTES.ONBOARDING)
      }
      return
    }

    // If on onboarding page but onboarding is complete, redirect to dashboard
    if (pathname === USER_JOURNEY_ROUTES.ONBOARDING && !needsOnboarding) {
      router.push(USER_JOURNEY_ROUTES.DASHBOARD)
      return
    }

    // Check role requirements
    if (requiredRole && !hasRole(requiredRole)) {
      console.warn(`Access denied: User role '${userRole}' does not match required role '${requiredRole}'`)
      router.push(USER_JOURNEY_ROUTES.UNAUTHORIZED)
      return
    }

    // Check permission requirements
    if (requiredPermission && !hasPermission(requiredPermission)) {
      console.warn(`Access denied: User lacks required permission '${requiredPermission}'`)
      router.push(USER_JOURNEY_ROUTES.UNAUTHORIZED)
      return
    }

  }, [
    isLoading,
    isAuthenticated,
    needsOnboarding,
    requireOnboarding,
    pathname,
    router,
    redirectTo,
    requiredRole,
    requiredPermission,
    hasRole,
    hasPermission,
    userRole
  ])

  return {
    isLoading,
    isAuthenticated,
    needsOnboarding,
    userRole,
    // Helper functions for conditional rendering
    canAccess: isAuthenticated && (!requireOnboarding || !needsOnboarding),
    shouldShowOnboarding: isAuthenticated && needsOnboarding && requireOnboarding,
    shouldShowLogin: !isAuthenticated,
  }
}

/**
 * Hook for pages that require authentication (with onboarding)
 */
export const useRequireAuth = (options: Omit<AuthGuardOptions, 'requireOnboarding'> = {}) => {
  return useAuthGuard({ ...options, requireOnboarding: true })
}

/**
 * Hook for pages that require authentication but not onboarding
 * (useful for onboarding page itself)
 */
export const useRequireAuthOnly = (options: Omit<AuthGuardOptions, 'requireOnboarding'> = {}) => {
  return useAuthGuard({ ...options, requireOnboarding: false })
}

/**
 * Hook for role-based access control
 */
export const useRequireRole = (role: string, options: AuthGuardOptions = {}) => {
  return useAuthGuard({ ...options, requiredRole: role as any })
}

/**
 * Hook for permission-based access control
 */
export const useRequirePermission = (permission: string, options: AuthGuardOptions = {}) => {
  return useAuthGuard({ ...options, requiredPermission: permission as any })
}

/**
 * Simple auth guard that only checks authentication
 * 
 * @param redirectTo - Where to redirect if not authenticated
 * 
 * @example
 * ```tsx
 * function Dashboard() {
 *   useSimpleAuthGuard('/login')
 *   return <div>Dashboard content</div>
 * }
 * ```
 */
export function useSimpleAuthGuard(redirectTo: string = routeConfig.login) {
  return useAuthGuard({ redirectTo })
}

/**
 * Role-based auth guard
 * 
 * @param role - Required user role
 * @param redirectTo - Where to redirect if unauthorized
 * 
 * @example
 * ```tsx
 * function AdminPanel() {
 *   useRoleGuard('admin')
 *   return <div>Admin Panel</div>
 * }
 * ```
 */
export function useRoleGuard(
  role: UserRole, 
  redirectTo: string = routeConfig.unauthorized
) {
  return useAuthGuard({ requiredRole: role, redirectTo })
}

/**
 * Permission-based auth guard
 * 
 * @param permission - Required permission
 * @param redirectTo - Where to redirect if unauthorized
 * 
 * @example
 * ```tsx
 * function UserManagement() {
 *   usePermissionGuard('users:manage')
 *   return <div>User Management</div>
 * }
 * ```
 */
export function usePermissionGuard(
  permission: Permission, 
  redirectTo: string = routeConfig.unauthorized
) {
  return useAuthGuard({ requiredPermission: permission, redirectTo })
}

export default useAuthGuard