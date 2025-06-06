/**
 * Main onboarding form hook
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import type { FormData, OnboardingHookReturn } from '../types/onboarding';

const INITIAL_FORM_DATA: FormData = {
  firstName: '',
  lastName: '',
  learningStyle: '',
  depth: '',
  schedule: '',
  tone: '',
  topics: [],
  interests: [],
};

export function useOnboardingForm(): OnboardingHookReturn {
  const router = useRouter();
  const { registerUser, completeOnboarding, isRegistered, registering, completingOnboarding } = useUnifiedAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  
  const isSubmitting = registering || completingOnboarding;

  const updateField = (field: keyof FormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = (step: number): boolean => {
    switch (step) {
      case 1:
        return (
          formData.firstName.trim() !== '' && formData.lastName.trim() !== ''
        );
      case 2:
        return formData.learningStyle !== '' && formData.depth !== '';
      case 3:
        return formData.schedule !== '' && formData.tone !== '';
      case 4:
        return true; // Step 4 is optional
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (canProceed(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!canProceed(4)) return;

    try {
      const onboardingAnswers = {
        learningStyle: formData.learningStyle,
        depth: formData.depth,
        schedule: formData.schedule,
        tone: formData.tone,
        topics: formData.topics,
        interests: formData.interests,
      };

      if (!isRegistered) {
        // User is not registered yet - register with onboarding data
        await registerUser({
          role: 'student',
          name: `${formData.firstName} ${formData.lastName}`,
          onboard_answers: onboardingAnswers,
          want_quizzes: true,
        });
      } else {
        // User is registered but needs to complete onboarding
        await completeOnboarding(onboardingAnswers, true);
      }

      toast.success('Profile created successfully! Welcome to Learn-X!');
      // The hook will reload the page automatically, which will update the auth context
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  return {
    currentStep,
    formData,
    isSubmitting,
    canProceed,
    nextStep,
    prevStep,
    updateField,
    handleSubmit,
  };
}
