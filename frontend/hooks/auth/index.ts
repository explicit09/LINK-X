/**
 * SIMPLE AUTH HOOKS
 * Just the essentials - no complex business logic
 */

import { useAuth } from '@/hooks/useAuth'

/**
 * Simple hook to check if user needs to log in
 */
export function useRequireAuth() {
  const { loading, isAuthenticated } = useAuth()
  return { loading, isAuthenticated, needsAuth: !isAuthenticated }
}

/**
 * Simple hook to get auth actions
 */
export function useAuthActions() {
  const { signIn, signUp, signInWithGoogle, signOut } = useAuth()
  return { signIn, signUp, signInWithGoogle, signOut }
}