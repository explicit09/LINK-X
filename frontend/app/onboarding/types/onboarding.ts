/**
 * TypeScript types for onboarding
 */

export interface FormData {
  firstName: string;
  lastName: string;
  learningStyle: string;
  depth: string;
  schedule: string;
  tone: string;
  topics: string[];
  interests: string[];
}

export interface StepComponentProps {
  formData: FormData;
  updateField: (field: keyof FormData, value: string | string[]) => void;
  onNext?: () => void;
}

export interface TagInputProps {
  type: 'topics' | 'interests';
  formData: FormData;
  updateField: (field: keyof FormData, value: string | string[]) => void;
  suggestions: string[];
  placeholder: string;
  maxTags: number;
  label: string;
  colorScheme: 'blue' | 'green';
}

export interface OnboardingHookReturn {
  currentStep: number;
  formData: FormData;
  isSubmitting: boolean;
  canProceed: (step: number) => boolean;
  nextStep: () => void;
  prevStep: () => void;
  updateField: (field: keyof FormData, value: string | string[]) => void;
  handleSubmit: () => Promise<void>;
}