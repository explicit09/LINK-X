import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  OnboardingData,
  AccountData,
  NotificationSettings,
  PrivacySettings,
  SettingsState,
} from '../types/settings.types';

const initialOnboarding: OnboardingData = {
  name: '',
  job: '',
  traits: '',
  learningStyle: '',
  depth: '',
  topics: '',
  interests: '',
  schedule: '',
  quizzes: false,
};

const initialAccount: AccountData = {
  email: '',
  password: '',
};

const initialNotifications: NotificationSettings = {
  pushNotifications: true,
  emailNotifications: true,
  weeklyDigest: true,
};

const initialPrivacy: PrivacySettings = {
  profileVisibility: true,
};

export const useSettings = () => {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [state, setState] = useState<SettingsState>({
    isStudent: false,
    loading: true,
    onboarding: initialOnboarding,
    account: initialAccount,
    notifications: initialNotifications,
    privacy: initialPrivacy,
  });

  // Check user role
  const checkUserRole = useCallback(async () => {
    try {
      if (!user || !profile) {
        setState((prev) => ({ ...prev, isStudent: false, loading: false }));
        return false;
      }

      const isStudent = profile.role === 'student';
      setState((prev) => ({ ...prev, isStudent, loading: false }));
      return isStudent;
    } catch (error) {
      console.error('Failed to check user role:', error);
      setState((prev) => ({ ...prev, isStudent: false, loading: false }));
      return false;
    }
  }, [user, profile]);

  // Fetch user profile
  const fetchProfile = useCallback(async (isStudent: boolean) => {
    try {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // For now, we'll use the basic profile data and set defaults for missing fields
      // TODO: Extend the profile to include onboarding data when needed
      setState((prev) => ({
        ...prev,
        account: { email: user.email || '', password: '' },
        onboarding: isStudent
          ? {
              name: user.email?.split('@')[0] || '',
              job: '',
              traits: '',
              learningStyle: '',
              depth: '',
              topics: '',
              interests: '',
              schedule: '',
              quizzes: false,
            }
          : prev.onboarding,
      }));
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  }, [user, profile]);

  // Update account info
  const updateAccount = useCallback(
    async (accountData: AccountData): Promise<void> => {
      try {
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Update email in Supabase auth if it's different
        if (accountData.email !== user.email) {
          const { error: emailError } = await supabase.auth.updateUser({
            email: accountData.email,
          });
          
          if (emailError) {
            throw new Error(`Failed to update email: ${emailError.message}`);
          }
        }

        // Update password if provided
        if (accountData.password) {
          const { error: passwordError } = await supabase.auth.updateUser({
            password: accountData.password,
          });
          
          if (passwordError) {
            throw new Error(`Failed to update password: ${passwordError.message}`);
          }
        }

        setState((prev) => ({ ...prev, account: accountData }));
        router.push('/dashboard');
      } catch (error) {
        console.error('Failed to update account:', error);
        throw error;
      }
    },
    [router, user],
  );

  // Update onboarding info (students only)
  const updateOnboarding = useCallback(
    async (onboardingData: OnboardingData): Promise<void> => {
      try {
        if (!user || !profile) {
          throw new Error('User not authenticated');
        }

        // TODO: Update user profile with onboarding data
        // For now, just update the local state since we don't have 
        // the full profile schema with onboarding data
        setState((prev) => ({ ...prev, onboarding: onboardingData }));
        router.push('/dashboard');
      } catch (error) {
        console.error('Failed to update onboarding:', error);
        throw error;
      }
    },
    [router, user, profile],
  );

  // Update notification settings
  const updateNotifications = useCallback(
    (notifications: NotificationSettings) => {
      setState((prev) => ({ ...prev, notifications }));
      // TODO: Persist to backend when API is available
    },
    [],
  );

  // Update privacy settings
  const updatePrivacy = useCallback((privacy: PrivacySettings) => {
    setState((prev) => ({ ...prev, privacy }));
    // TODO: Persist to backend when API is available
  }, []);

  // Initialize settings
  useEffect(() => {
    const init = async () => {
      const isStudent = await checkUserRole();
      await fetchProfile(isStudent);
    };
    init();
  }, [checkUserRole, fetchProfile]);

  return {
    ...state,
    updateAccount,
    updateOnboarding,
    updateNotifications,
    updatePrivacy,
  };
};
