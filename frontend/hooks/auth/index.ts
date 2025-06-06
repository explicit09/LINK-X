/**
 * Authentication Hooks
 * Reusable hooks for auth-related functionality
 */
import { useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth/auth-context'

/**
 * Require authentication for a page/component
 * Redirects to login if not authenticated
 */
export function useRequireAuth(redirectTo = '/login') {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Save intended destination
      const returnUrl = encodeURIComponent(pathname)
      router.push(`${redirectTo}?returnUrl=${returnUrl}`)
    }
  }, [loading, isAuthenticated, router, redirectTo, pathname])

  return { user, loading, isAuthenticated }
}

/**
 * Require specific role(s)
 * Redirects to unauthorized page if user doesn't have required role
 */
export function useRequireRole(
  roles: Array<'student' | 'instructor' | 'admin'>,
  redirectTo = '/unauthorized'
) {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const userRole = user.user_metadata?.role
      if (!roles.includes(userRole)) {
        router.push(redirectTo)
      }
    }
  }, [loading, isAuthenticated, user, roles, router, redirectTo])

  const hasRole = user ? roles.includes(user.user_metadata?.role) : false

  return { user, loading, hasRole }
}

/**
 * Require instructor role
 */
export function useRequireInstructor() {
  return useRequireRole(['instructor', 'admin'])
}

/**
 * Require admin role
 */
export function useRequireAdmin() {
  return useRequireRole(['admin'])
}

/**
 * Auth actions without the full context
 * Useful for components that only need actions
 */
export function useAuthActions() {
  const {
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    resetPassword,
    updatePassword,
    refreshSession,
    clearError,
  } = useAuth()

  return {
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    resetPassword,
    updatePassword,
    refreshSession,
    clearError,
  }
}

/**
 * Get current user role
 */
export function useUserRole() {
  const { user, isStudent, isInstructor, isAdmin } = useAuth()
  
  const role = user?.user_metadata?.role || null
  
  return {
    role,
    isStudent,
    isInstructor,
    isAdmin,
  }
}

/**
 * Handle auth redirects after login
 */
export function useAuthRedirect() {
  const router = useRouter()
  const { user } = useAuth()

  const redirectAfterLogin = useCallback((defaultPath = '/dashboard') => {
    // Check for return URL in query params
    const params = new URLSearchParams(window.location.search)
    const returnUrl = params.get('returnUrl')
    
    if (returnUrl) {
      router.push(decodeURIComponent(returnUrl))
      return
    }

    // Redirect based on role
    if (user) {
      const role = user.user_metadata?.role
      switch (role) {
        case 'admin':
          router.push('/admin/dashboard')
          break
        case 'instructor':
          router.push('/dashboard')
          break
        case 'student':
          router.push('/my-courses')
          break
        default:
          router.push(defaultPath)
      }
    } else {
      router.push(defaultPath)
    }
  }, [router, user])

  return { redirectAfterLogin }
}

/**
 * Check if user has specific permission
 * Can be extended with more granular permissions
 */
export function usePermission(permission: string) {
  const { user } = useAuth()
  
  // Define permission mappings
  const rolePermissions: Record<string, string[]> = {
    admin: ['*'], // Admin has all permissions
    instructor: [
      'create_course',
      'edit_own_course',
      'delete_own_course',
      'view_course_analytics',
      'manage_students',
    ],
    student: [
      'view_course',
      'submit_assignment',
      'view_grades',
      'join_study_group',
    ],
  }

  const userRole = user?.user_metadata?.role || 'student'
  const permissions = rolePermissions[userRole] || []

  const hasPermission = permissions.includes('*') || permissions.includes(permission)

  return { hasPermission }
}

/**
 * Auto-logout on inactivity
 */
export function useAutoLogout(timeoutMinutes = 30) {
  const { signOut, user } = useAuth()

  useEffect(() => {
    if (!user) return

    let timeoutId: NodeJS.Timeout

    const resetTimeout = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        signOut()
      }, timeoutMinutes * 60 * 1000)
    }

    // Reset on user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, resetTimeout)
    })

    // Initial timeout
    resetTimeout()

    return () => {
      clearTimeout(timeoutId)
      events.forEach(event => {
        document.removeEventListener(event, resetTimeout)
      })
    }
  }, [user, signOut, timeoutMinutes])
}

/**
 * Get auth token for API calls
 */
export function useAuthToken() {
  const { session } = useAuth()
  
  const getToken = useCallback(async () => {
    if (!session) return null
    
    // Check if token is expired
    const expiresAt = session.expires_at
    if (expiresAt && new Date(expiresAt * 1000) < new Date()) {
      // Token expired, trigger refresh
      const { refreshSession } = useAuthActions()
      await refreshSession()
    }
    
    return session.access_token
  }, [session])

  return { token: session?.access_token || null, getToken }
}