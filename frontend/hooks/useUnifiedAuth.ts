/**
 * Hook for using unified authentication system
 */
import { useState } from 'react';
import { useAuth } from '@/app/(auth)/AuthContext';
import { unifiedAuthService, RegistrationData, OnboardingData } from '@/lib/auth/unified-auth-service';
import { authService } from '@/lib/auth/supabase-auth-service';

export function useUnifiedAuth() {
  const { user, session, requiresOnboarding, loading } = useAuth();
  const [registering, setRegistering] = useState(false);
  const [completingOnboarding, setCompletingOnboarding] = useState(false);

  /**
   * Register a new user with backend
   */
  const registerUser = async (userData: Omit<RegistrationData, 'access_token'>) => {
    if (!user) {
      throw new Error('No authenticated user found');
    }

    setRegistering(true);
    try {
      const token = await authService.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const registrationData: RegistrationData = {
        ...userData,
        access_token: token,
      };

      const result = await unifiedAuthService.registerUser(registrationData);
      
      // Reload the page to refresh auth context
      window.location.reload();
      
      return result;
    } finally {
      setRegistering(false);
    }
  };

  /**
   * Complete onboarding for current user
   */
  const completeOnboarding = async (onboardingAnswers: Record<string, any>, wantQuizzes = false) => {
    if (!user) {
      throw new Error('No authenticated user found');
    }

    setCompletingOnboarding(true);
    try {
      const token = await authService.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const onboardingData: OnboardingData = {
        access_token: token,
        onboard_answers: onboardingAnswers,
        want_quizzes: wantQuizzes,
      };

      await unifiedAuthService.completeOnboarding(onboardingData);
      
      // Reload the page to refresh auth context
      window.location.reload();
      
      return true;
    } finally {
      setCompletingOnboarding(false);
    }
  };

  /**
   * Get redirect path based on current auth state
   */
  const getRedirectPath = (): string => {
    if (!user) {
      return '/login';
    }

    if (!session || !session.registered) {
      return '/onboarding';
    }

    if (requiresOnboarding) {
      return '/onboarding';
    }

    return '/dashboard';
  };

  return {
    // Auth state
    user,
    session,
    requiresOnboarding,
    loading,
    
    // Actions
    registerUser,
    completeOnboarding,
    getRedirectPath,
    
    // Loading states
    registering,
    completingOnboarding,
    
    // Computed state
    isAuthenticated: !!user,
    isRegistered: !!session?.registered,
    needsOnboarding: requiresOnboarding,
  };
}