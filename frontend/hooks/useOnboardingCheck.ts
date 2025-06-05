import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth-service';
import { authAPI } from '@/lib/api/endpoints/auth';

export function useOnboardingCheck() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        // First check if user is authenticated
        if (!authService.isAuthenticated()) {
          setIsChecking(false);
          return;
        }

        // Check registration status with backend
        const response = await authAPI.v2.checkRegistration();
        
        if (response.registered && !response.has_completed_onboarding) {
          // User is registered but hasn't completed onboarding
          setNeedsOnboarding(true);
          if (response.user?.role === 'student') {
            router.push('/onboarding');
          }
        }
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboardingStatus();
  }, [router]);

  return { isChecking, needsOnboarding };
}