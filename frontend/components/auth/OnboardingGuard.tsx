'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/(auth)/AuthContext';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

/**
 * OnboardingGuard - Ensures students have completed onboarding before accessing protected pages
 * Uses existing auth context instead of making fresh API calls to prevent race conditions
 */
export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const router = useRouter();
  const { user, loading, isRegistered, backendUser } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Wait for auth context to finish loading
    if (loading) {
      return;
    }

    console.log('[OnboardingGuard] Auth state:', { user, isRegistered, backendUser });

    // If no user, redirect to login
    if (!user) {
      console.log('[OnboardingGuard] No user found, redirecting to login');
      router.push('/login');
      return;
    }

    // If user exists but not registered with backend, redirect to onboarding
    if (!isRegistered || !backendUser) {
      console.log('[OnboardingGuard] User not registered with backend, redirecting to onboarding');
      router.push('/onboarding');
      return;
    }

    // For students, check if onboarding is completed
    if (backendUser.role === 'student' && !backendUser.has_completed_onboarding) {
      console.log('[OnboardingGuard] Student has not completed onboarding');
      router.push('/onboarding');
      return;
    }

    // All checks passed, allow access
    console.log('[OnboardingGuard] All checks passed, allowing access');
    setIsChecking(false);
  }, [user, loading, isRegistered, backendUser, router]);
  
  if (loading || isChecking) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}