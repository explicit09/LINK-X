'use client';

import { useEffect } from 'react';
import { authService } from '@/lib/auth-service';
import { supabase, onAuthStateChange } from '@/supabaseconfig';

/**
 * AuthStateProvider - Ensures auth state is properly initialized and synced
 * This component should be included in the root layout
 */
export function AuthStateProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Set up Supabase auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthStateProvider] Auth event:', event, 'Session:', session?.user?.email);
      
      if (event === 'SIGNED_IN' && session) {
        // User signed in, sync with backend
        try {
          const loginSuccess = await authService.loginWithSupabase(session.access_token);
          if (!loginSuccess) {
            console.error('[AuthStateProvider] Failed to establish backend session');
          }
        } catch (error) {
          console.error('[AuthStateProvider] Error syncing session:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        // User signed out, clear auth state
        authService.logout();
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Token refreshed, update backend
        try {
          await authService.loginWithSupabase(session.access_token);
        } catch (error) {
          console.error('[AuthStateProvider] Error refreshing session:', error);
        }
      } else if (event === 'INITIAL_SESSION' && session) {
        // Initial session detected on page load
        console.log('[AuthStateProvider] Restoring session for:', session.user.email);
        try {
          const loginSuccess = await authService.loginWithSupabase(session.access_token);
          if (!loginSuccess) {
            console.error('[AuthStateProvider] Failed to restore backend session');
          }
        } catch (error) {
          console.error('[AuthStateProvider] Error restoring session:', error);
        }
      }
    });

    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}