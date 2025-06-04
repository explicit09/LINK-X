/**
 * Onboarding navigation component
 */

import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface OnboardingNavigationProps {
  currentStep: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  canGoNext: boolean;
  isSubmitting: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function OnboardingNavigation({
  currentStep,
  isFirstStep,
  isLastStep,
  canGoNext,
  isSubmitting,
  onPrev,
  onNext,
  onSubmit,
}: OnboardingNavigationProps) {
  return (
    <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
      <Button
        onClick={onPrev}
        disabled={isFirstStep}
        variant="outline"
        className="h-12 px-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {isLastStep ? (
        <Button
          onClick={onSubmit}
          disabled={!canGoNext || isSubmitting}
          className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Creating profile...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span>Start Learning</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          )}
        </Button>
      ) : (
        <Button
          onClick={onNext}
          disabled={!canGoNext}
          className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        >
          <span>Next</span>
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );
}
