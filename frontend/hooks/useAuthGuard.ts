import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { onAuthStateChange } from '@/lib/auth/supabase-auth-service';

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

  useEffect(() => {
    const checkAuthStatus = async (user: any) => {
      if (!user) {
        // No Firebase user, redirect to login
        setState({
          isLoading: false,
          isAuthenticated: false,
          isRegistered: false,
          needsOnboarding: false
        });
        router.push('/login');
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
          router.push('/login');
        }
      }
    };

    const unsubscribe = onAuthStateChange(checkAuthStatus);

    return () => unsubscribe();
  }, [router, requireRegistration]);

  return state;
}