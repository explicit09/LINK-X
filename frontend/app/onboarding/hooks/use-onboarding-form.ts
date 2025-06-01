/**
 * Main onboarding form hook
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { userAPI, authAPI, authService } from '@/lib/api';
import { auth } from '@/firebaseconfig';
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
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

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

    setIsSubmitting(true);
    try {
      // First, register the user with the backend
      const registrationData = {
        role: 'student' as const,
        name: `${formData.firstName} ${formData.lastName}`,
        onboard_answers: {
          learningStyle: formData.learningStyle,
          depth: formData.depth,
          schedule: formData.schedule,
          tone: formData.tone,
          topics: formData.topics,
          interests: formData.interests,
        },
        want_quizzes: true, // Default to true, can be made configurable
      };

      // Register with backend
      const registrationResult = await authAPI.v2.register(registrationData);
      
      // After successful registration, establish session
      if (auth.currentUser) {
        const sessionSuccess = await authService.login(auth.currentUser);
        if (!sessionSuccess) {
          console.warn('Failed to establish session after registration');
        }
      }

      toast.success('Profile created successfully! Welcome to Learn-X!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
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
