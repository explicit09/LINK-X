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
    // Skip if already initialized to prevent loops
    if (isInitialized) return;
    
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
            router.replace('/onboarding'); // Use replace to prevent loops
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
            router.replace('/login'); // Use replace to prevent loops
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
          router.replace('/login'); // Use replace to prevent loops
        }
      } finally {
        setIsInitialized(true);
      }
    };

    checkInitialAuth();
  }, [isInitialized]); // Add isInitialized to deps to prevent re-runs

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
          router.replace('/login'); // Use replace to prevent loops
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
            router.replace('/onboarding'); // Use replace to prevent loops
          }
        } else {
          // User is not registered - needs onboarding
          setState({
            isLoading: false,
            isAuthenticated: true,
            isRegistered: false,
            needsOnboarding: true
          });
          
          if (requireRegistration) {
            router.replace('/onboarding'); // Use replace to prevent loops
          }
        }
      } catch (error: any) {
        console.error('Auth check error:', error);
        
        // Any error means we couldn't verify registration status
        // Assume not authenticated to be safe
        setState({
          isLoading: false,
          isAuthenticated: false,
          isRegistered: false,
          needsOnboarding: false
        });
        
        if (requireRegistration) {
          router.replace('/login'); // Use replace to prevent loops
        }
      }
    };

    const unsubscribe = onAuthStateChange(checkAuthStatus);

    return () => unsubscribe();
  }, [router, requireRegistration, isInitialized]);

  return state;
}