import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabaseconfig';
import { authService } from '@/lib/auth-service';
import { resetAuthInitializer } from '@/lib/auth/auth-initializer';

interface UseAuthPersistenceOptions {
  redirectTo?: string;
  requireAuth?: boolean;
  requireRegistration?: boolean;
}

interface AuthPersistenceState {
  isLoading: boolean;
  isAuthenticated: boolean;
  isRegistered: boolean;
  hasCompletedOnboarding: boolean;
  user: any;
}

/**
 * Hook to handle auth persistence and automatic session restoration
 */
export function useAuthPersistence(options: UseAuthPersistenceOptions = {}) {
  const router = useRouter();
  const { redirectTo = '/dashboard', requireAuth = false, requireRegistration = false } = options;
  
  const [state, setState] = useState<AuthPersistenceState>({
    isLoading: true,
    isAuthenticated: false,
    isRegistered: false,
    hasCompletedOnboarding: false,
    user: null,
  });

  useEffect(() => {
    let mounted = true;

    const checkAndRestoreSession = async () => {
      try {
        console.log('[useAuthPersistence] Checking for existing session...');
        
        // Check for Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log('[useAuthPersistence] No session found');
          
          if (mounted) {
            setState({
              isLoading: false,
              isAuthenticated: false,
              isRegistered: false,
              hasCompletedOnboarding: false,
              user: null,
            });
          }
          
          // Redirect to login if auth is required
          if (requireAuth) {
            router.push('/login');
          }
          
          return;
        }

        console.log('[useAuthPersistence] Found session, restoring backend auth...');
        
        // Restore backend session
        const loginSuccess = await authService.loginWithSupabase(session.access_token);
        
        if (!loginSuccess) {
          console.error('[useAuthPersistence] Failed to restore backend session');
          
          if (mounted) {
            setState({
              isLoading: false,
              isAuthenticated: false,
              isRegistered: false,
              hasCompletedOnboarding: false,
              user: null,
            });
          }
          
          if (requireAuth) {
            router.push('/login');
          }
          
          return;
        }

        // Check registration status
        const isRegistered = authService.isRegistered();
        const hasCompletedOnboarding = authService.hasCompletedOnboarding();
        const user = authService.getUser();

        console.log('[useAuthPersistence] Auth restored:', {
          isRegistered,
          hasCompletedOnboarding,
          role: user?.role,
        });

        if (mounted) {
          setState({
            isLoading: false,
            isAuthenticated: true,
            isRegistered,
            hasCompletedOnboarding,
            user,
          });
        }

        // Handle redirects based on auth state
        if (requireRegistration && !isRegistered) {
          router.push('/onboarding');
        } else if (requireRegistration && !hasCompletedOnboarding && user?.role === 'student') {
          router.push('/onboarding');
        } else if (redirectTo) {
          // If user is fully authenticated and on a public page, redirect to dashboard
          const currentPath = window.location.pathname;
          if (currentPath === '/login' || currentPath === '/register') {
            router.push(redirectTo);
          }
        }
      } catch (error) {
        console.error('[useAuthPersistence] Error restoring session:', error);
        
        if (mounted) {
          setState({
            isLoading: false,
            isAuthenticated: false,
            isRegistered: false,
            hasCompletedOnboarding: false,
            user: null,
          });
        }
        
        if (requireAuth) {
          router.push('/login');
        }
      }
    };

    checkAndRestoreSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[useAuthPersistence] Auth state changed:', event);
      
      if (event === 'SIGNED_OUT') {
        // Clear everything on sign out
        resetAuthInitializer();
        
        if (mounted) {
          setState({
            isLoading: false,
            isAuthenticated: false,
            isRegistered: false,
            hasCompletedOnboarding: false,
            user: null,
          });
        }
        
        if (requireAuth) {
          router.push('/login');
        }
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        // Re-check auth state when signed in or token refreshed
        await checkAndRestoreSession();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, redirectTo, requireAuth, requireRegistration]);

  return state;
}