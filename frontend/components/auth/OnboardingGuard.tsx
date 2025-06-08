'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

/**
 * ONBOARDING GUARD
 * Checks authentication and onboarding completion
 * - Redirects to login if not authenticated
 * - Redirects to onboarding if not completed
 */
export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const router = useRouter();
  const { user, loading, isAuthenticated, needsOnboarding } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Wait for auth to load
    if (loading) {
      console.log('[OnboardingGuard] Still loading auth state...');
      return;
    }

    console.log('[OnboardingGuard] Auth state loaded:', { 
      user: user?.email, 
      isAuthenticated,
      needsOnboarding
    });

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      console.log('[OnboardingGuard] Not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    // If authenticated but needs onboarding, redirect to onboarding
    if (needsOnboarding) {
      console.log('[OnboardingGuard] User needs onboarding, redirecting');
      router.push('/onboarding');
      return;
    }

    // All checks passed, allow access
    console.log('[OnboardingGuard] All checks passed, allowing access');
    setIsChecking(false);
  }, [user, loading, isAuthenticated, needsOnboarding, router]);
  
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