'use client'

/**
 * SIMPLE AUTH HOOK
 * This is the ONE hook you need for authentication.
 * No complexity, no business logic, just auth.
 */

import { useAuthContext } from '@/contexts/AuthProvider'
import type { AuthContextState } from '@/lib/auth/types'

/**
 * Main authentication hook
 * 
 * This is the primary hook that components should use to access authentication
 * functionality. It provides a clean, simple interface to all auth operations.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, signIn, signOut } = useAuth()
 *   
 *   if (!isAuthenticated) {
 *     return <button onClick={() => signIn({ email, password })}>Sign In</button>
 *   }
 *   
 *   return (
 *     <div>
 *       <p>Welcome {user?.email}!</p>
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useAuth(): AuthContextState {
  return useAuthContext()
}

export default useAuth