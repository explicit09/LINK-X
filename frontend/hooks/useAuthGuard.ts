import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { onAuthStateChange } from '@/lib/auth/supabase-auth-service';
import { initializeAuth, resetAuthInitializer } from '@/lib/auth/auth-initializer';

interface AuthGuardState {
  isLoading: boolean;
  isAuthenticated: boolean;
  isRegistered: boolean;
  needsOnboarding: boolean;
}

export function useAuthGuard(requireRegistration: boolean = true) {
  const router = useRouter();
  const [state, setState] = useState<AuthGuardState>({
    isLoading: true,
    isAuthenticated: false,
    isRegistered: false,
    needsOnboarding: false
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const checkInitialAuth = async () => {
      try {
        console.log('[useAuthGuard] Checking initial auth state...');
        const authState = await initializeAuth();
        
        console.log('[useAuthGuard] Initial auth state:', authState);
        
        if (authState.isAuthenticated) {
          // User has existing session
          setState({
            isLoading: false,
            isAuthenticated: true,
            isRegistered: authState.isRegistered,
            needsOnboarding: authState.needsOnboarding
          });
          
          // Handle routing based on state
          if (authState.needsOnboarding && requireRegistration) {
            router.push('/onboarding');
          }
        } else {
          // No existing session
          setState({
            isLoading: false,
            isAuthenticated: false,
            isRegistered: false,
            needsOnboarding: false
          });
          
          if (requireRegistration) {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('[useAuthGuard] Error checking initial auth:', error);
        setState({
          isLoading: false,
          isAuthenticated: false,
          isRegistered: false,
          needsOnboarding: false
        });
        
        if (requireRegistration) {
          router.push('/login');
        }
      } finally {
        setIsInitialized(true);
      }
    };

    checkInitialAuth();
  }, []);

  // Listen for auth state changes after initialization
  useEffect(() => {
    if (!isInitialized) return;

    const checkAuthStatus = async (user: any) => {
      if (!user) {
        // User logged out
        resetAuthInitializer(); // Clear cached auth state
        setState({
          isLoading: false,
          isAuthenticated: false,
          isRegistered: false,
          needsOnboarding: false
        });
        
        if (requireRegistration) {
          router.push('/login');
        }
        return;
      }

      try {
        // User is authenticated with Supabase, check registration
        const registrationCheck = await authAPI.v2.checkRegistration();
        console.log('[useAuthGuard] Registration check response:', registrationCheck);
        
        // The checkRegistration function now returns the parsed data directly
        const isRegistered = registrationCheck.isRegistered;
        const hasCompletedOnboarding = registrationCheck.has_completed_onboarding ?? true; // Default to true for backward compatibility
        
        console.log('[useAuthGuard] Status:', { isRegistered, hasCompletedOnboarding });
        
        if (isRegistered && hasCompletedOnboarding) {
          // User is registered and has completed onboarding
          setState({
            isLoading: false,
            isAuthenticated: true,
            isRegistered: true,
            needsOnboarding: false
          });
        } else if (isRegistered && !hasCompletedOnboarding) {
          // User is registered but hasn't completed onboarding
          setState({
            isLoading: false,
            isAuthenticated: true,
            isRegistered: true,
            needsOnboarding: true
          });
          
          if (requireRegistration) {
            router.push('/onboarding');
          }
        } else {
          // User needs to complete registration
          setState({
            isLoading: false,
            isAuthenticated: true,
            isRegistered: false,
            needsOnboarding: true
          });
          
          if (requireRegistration) {
            router.push('/onboarding');
          }
        }
      } catch (error: any) {
        console.error('Auth check error:', error);
        
        // If check-registration returns 404, user needs onboarding
        if (error?.status === 404 || error?.response?.status === 404) {
          setState({
            isLoading: false,
            isAuthenticated: true,
            isRegistered: false,
            needsOnboarding: true
          });
          
          if (requireRegistration) {
            router.push('/onboarding');
          }
        } else {
          // Other errors - assume not authenticated
          setState({
            isLoading: false,
            isAuthenticated: false,
            isRegistered: false,
            needsOnboarding: false
          });
          
          if (requireRegistration) {
            router.push('/login');
          }
        }
      }
    };

    const unsubscribe = onAuthStateChange(checkAuthStatus);

    return () => unsubscribe();
  }, [router, requireRegistration, isInitialized]);

  return state;
}