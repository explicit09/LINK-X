'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { toast } from 'sonner';
import { supabase } from '@/supabaseconfig';

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
      // Check if user is authenticated with Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      try {
        // Check registration status with backend
        const registrationCheck = await authAPI.v2.checkRegistration();
        console.log('[OnboardingGuard] Registration check:', registrationCheck);
        
        // Check if user is registered and has completed onboarding
        if (registrationCheck.isRegistered && !registrationCheck.has_completed_onboarding) {
          toast.info('Please complete your profile setup first');
          router.push('/onboarding');
        }
      } catch (error) {
        console.error('[OnboardingGuard] Error checking registration:', error);
        // If there's an error, assume user needs to register
        router.push('/onboarding');
      }
    };

    checkOnboarding();
  }, [router]);

  return <>{children}</>;
}