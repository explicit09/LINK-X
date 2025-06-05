import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { auth } from '@/firebaseconfig';
import { onAuthStateChanged } from 'firebase/auth';

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
        // User is authenticated with Firebase, check registration
        const registrationCheck = await authAPI.v2.checkRegistration();
        console.log('Registration check response:', registrationCheck);
        
        // The backend returns { success: true, data: { registered: true/false, has_completed_onboarding: true/false, ... } }
        const isRegistered = registrationCheck.data?.registered || registrationCheck.registered;
        const hasCompletedOnboarding = registrationCheck.data?.has_completed_onboarding ?? true; // Default to true for backward compatibility
        
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

    const unsubscribe = onAuthStateChanged(auth, checkAuthStatus);

    return () => unsubscribe();
  }, [router, requireRegistration]);

  return state;
}