/**
 * Step navigation utilities hook
 */

import { useCallback } from 'react';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  canProceed: (step: number) => boolean;
  onNext: () => void;
  onPrev: () => void;
}

export function useStepNavigation({
  currentStep,
  totalSteps,
  canProceed,
  onNext,
  onPrev,
}: StepNavigationProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canProceed(currentStep)) {
        e.preventDefault();
        onNext();
      }
    },
    [currentStep, canProceed, onNext],
  );

  const getStepProgress = () => {
    return (currentStep / totalSteps) * 100;
  };

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return {
    handleKeyDown,
    getStepProgress,
    isFirstStep,
    isLastStep,
    canGoNext: canProceed(currentStep),
    canGoBack: !isFirstStep,
  };
}
