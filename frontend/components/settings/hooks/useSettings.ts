import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  OnboardingData,
  AccountData,
  NotificationSettings,
  PrivacySettings,
  SettingsState,
} from '../types/settings.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
      const res = await fetch(`${API_URL}/me`, {
        method: 'GET',
        credentials: 'include',
      });
      const isStudent = res.status === 200 || res.status === 404;
      setState((prev) => ({ ...prev, isStudent, loading: false }));
      return isStudent;
    } catch (error) {
      console.error('Failed to check user role:', error);
      setState((prev) => ({ ...prev, isStudent: false, loading: false }));
      return false;
    }
  }, []);

  // Fetch user profile
  const fetchProfile = useCallback(async (isStudent: boolean) => {
    try {
      const path = isStudent ? '/student/profile' : '/professor/profile';
      const res = await fetch(`${API_URL}${path}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to fetch profile');

      const data = await res.json();

      setState((prev) => ({
        ...prev,
        account: { email: data.email || '', password: '' },
        onboarding: isStudent
          ? {
              name: data.name || '',
              job: data.onboard_answers?.job || '',
              traits: data.onboard_answers?.traits || '',
              learningStyle: data.onboard_answers?.learningStyle || '',
              depth: data.onboard_answers?.depth || '',
              topics: data.onboard_answers?.topics || '',
              interests: data.onboard_answers?.interests || '',
              schedule: data.onboard_answers?.schedule || '',
              quizzes: data.want_quizzes || false,
            }
          : prev.onboarding,
      }));
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  }, []);

  // Update account info
  const updateAccount = useCallback(
    async (accountData: AccountData): Promise<void> => {
      try {
        const res = await fetch(`${API_URL}/me`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: accountData.email,
            password: accountData.password || undefined,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText);
        }

        setState((prev) => ({ ...prev, account: accountData }));
        router.push('/dashboard');
      } catch (error) {
        console.error('Failed to update account:', error);
        throw error;
      }
    },
    [router],
  );

  // Update onboarding info (students only)
  const updateOnboarding = useCallback(
    async (onboardingData: OnboardingData): Promise<void> => {
      const payload = {
        name: onboardingData.name,
        onboard_answers: {
          job: onboardingData.job,
          traits: onboardingData.traits,
          learningStyle: onboardingData.learningStyle,
          depth: onboardingData.depth,
          topics: onboardingData.topics,
          interests: onboardingData.interests,
          schedule: onboardingData.schedule,
        },
        want_quizzes: onboardingData.quizzes,
      };

      try {
        const res = await fetch(`${API_URL}/student/profile`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(await res.text());

        setState((prev) => ({ ...prev, onboarding: onboardingData }));
        router.push('/dashboard');
      } catch (error) {
        console.error('Failed to update onboarding:', error);
        throw error;
      }
    },
    [router],
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
