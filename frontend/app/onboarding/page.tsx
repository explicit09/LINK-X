'use client';

/**
 * Refactored Onboarding Page - Modular and maintainable
 */

import { Card, CardContent } from '@/components/ui/card';
import { useOnboardingForm } from './hooks/use-onboarding-form';
import { useStepNavigation } from './hooks/use-step-navigation';
import {
  StepIndicator,
  PersonalInfoStep,
  LearningStyleStep,
  PreferencesStep,
  InterestsStep,
  OnboardingNavigation,
} from './components';

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const {
    currentStep,
    formData,
    isSubmitting,
    canProceed,
    nextStep,
    prevStep,
    updateField,
    handleSubmit,
  } = useOnboardingForm();

  const { isFirstStep, isLastStep, canGoNext, canGoBack } = useStepNavigation({
    currentStep,
    totalSteps: TOTAL_STEPS,
    canProceed,
    onNext: nextStep,
    onPrev: prevStep,
  });

  const renderStep = () => {
    const stepProps = {
      formData,
      updateField,
      onNext: nextStep,
    };

    switch (currentStep) {
      case 1:
        return <PersonalInfoStep {...stepProps} />;
      case 2:
        return <LearningStyleStep {...stepProps} />;
      case 3:
        return <PreferencesStep {...stepProps} />;
      case 4:
        return <InterestsStep {...stepProps} />;
      default:
        return <PersonalInfoStep {...stepProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
      </div>

      {/* Header */}
      <div className="relative z-10 pt-12 pb-6">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Welcome to Learn-X! 🚀
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Let's personalize your learning experience in just a few steps
          </p>

          <StepIndicator
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            canProceed={canProceed}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
          <CardContent className="p-8">
            {renderStep()}

            <OnboardingNavigation
              currentStep={currentStep}
              isFirstStep={isFirstStep}
              isLastStep={isLastStep}
              canGoNext={canGoNext}
              isSubmitting={isSubmitting}
              onPrev={prevStep}
              onNext={nextStep}
              onSubmit={handleSubmit}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
