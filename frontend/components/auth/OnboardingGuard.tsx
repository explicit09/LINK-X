'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth-service';
import { toast } from 'sonner';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

/**
 * OnboardingGuard - Ensures students have completed onboarding before accessing protected pages
 * Redirects to /onboarding if student hasn't completed profile setup
 */
export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const router = useRouter();

  useEffect(() => {
    const checkOnboarding = async () => {
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        router.push('/login');
        return;
      }

      // Check if user has completed onboarding
      const user = authService.getUser();
      if (user?.role === 'student' && !authService.hasCompletedOnboarding()) {
        toast.info('Please complete your profile setup first');
        router.push('/onboarding');
      }
    };

    checkOnboarding();
  }, [router]);

  return <>{children}</>;
}