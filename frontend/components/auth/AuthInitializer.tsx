'use client';

import { useEffect } from 'react';
import { initializeAuth } from '@/lib/auth/auth-initializer';

/**
 * AuthInitializer Component
 * Ensures that auth state is initialized from existing Supabase session on app load
 * This prevents users from having to log in again after page refresh
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize auth state on mount
    const init = async () => {
      try {
        console.log('[AuthInitializer] Initializing auth state...');
        const authState = await initializeAuth();
        console.log('[AuthInitializer] Auth state initialized:', {
          isAuthenticated: authState.isAuthenticated,
          isRegistered: authState.isRegistered,
          user: authState.user?.email
        });
      } catch (error) {
        console.error('[AuthInitializer] Failed to initialize auth:', error);
      }
    };
    
    init();
  }, []);

  return <>{children}</>;
}