// Authentication System - Auth Guard Hook
// Phase 2: Core Email Authentication
// File: hooks/useAuthGuard.ts

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './useAuth'
import type { UserRole, Permission, AuthGuardOptions } from '@/lib/auth/types'
import { routeConfig } from '@/lib/auth/config'

/**
 * Hook to protect routes and components that require authentication
 * 
 * Redirects unauthenticated users to login page and optionally checks
 * for specific roles or permissions.
 * 
 * @param options - Configuration options for the guard
 * 
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   useAuthGuard() // Redirect to login if not authenticated
 *   
 *   const { user } = useAuth()
 *   return <div>Welcome {user?.email}!</div>
 * }
 * ```
 * 
 * @example
 * ```tsx
 * function AdminPage() {
 *   useAuthGuard({ 
 *     requiredRole: 'admin',
 *     redirectTo: '/unauthorized' 
 *   })
 *   
 *   return <div>Admin Panel</div>
 * }
 * ```
 */
export function useAuthGuard(options: AuthGuardOptions = {}) {
  const router = useRouter()
  const { 
    isAuthenticated, 
    loading, 
    user, 
    hasRole, 
    hasPermission 
  } = useAuth()

  const {
    redirectTo = routeConfig.login,
    requiredRole,
    requiredPermission,
  } = options

  useEffect(() => {
    // Don't redirect while still loading
    if (loading) return

    // Check authentication
    if (!isAuthenticated) {
      console.log('[AuthGuard] User not authenticated, redirecting to:', redirectTo)
      router.push(redirectTo)
      return
    }

    // Check required role
    if (requiredRole && !hasRole(requiredRole)) {
      console.log('[AuthGuard] User missing required role:', requiredRole)
      router.push(routeConfig.unauthorized)
      return
    }

    // Check required permission
    if (requiredPermission && !hasPermission(requiredPermission)) {
      console.log('[AuthGuard] User missing required permission:', requiredPermission)
      router.push(routeConfig.unauthorized)
      return
    }

    console.log('[AuthGuard] Access granted for user:', user?.email)
  }, [
    isAuthenticated, 
    loading, 
    user?.email,
    requiredRole, 
    requiredPermission, 
    redirectTo,
    hasRole,
    hasPermission,
    router
  ])

  // Return guard status for conditional rendering
  return {
    isAuthenticated,
    loading,
    hasAccess: isAuthenticated && 
              (!requiredRole || hasRole(requiredRole)) && 
              (!requiredPermission || hasPermission(requiredPermission))
  }
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