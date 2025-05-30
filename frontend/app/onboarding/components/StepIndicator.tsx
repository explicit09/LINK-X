/**
 * Step indicator component for onboarding flow
 */

import { CheckCircle } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  canProceed: (step: number) => boolean;
}

export function StepIndicator({ currentStep, totalSteps, canProceed }: StepIndicatorProps) {
  const getStepStatus = (step: number) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'current';
    return 'upcoming';
  };

  const getStepClasses = (step: number) => {
    const status = getStepStatus(step);
    const baseClasses = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300';
    
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-500 text-white`;
      case 'current':
        return `${baseClasses} bg-blue-600 text-white ring-4 ring-blue-100`;
      default:
        return `${baseClasses} bg-gray-200 text-gray-500`;
    }
  };

  const getConnectorClasses = (step: number) => {
    const isCompleted = step < currentStep;
    return `flex-1 h-1 mx-2 transition-all duration-300 ${
      isCompleted ? 'bg-green-500' : 'bg-gray-200'
    }`;
  };

  return (
    <div className="w-full max-w-md mx-auto mb-8">
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div 
          className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, index) => {
          const step = index + 1;
          const status = getStepStatus(step);
          
          return (
            <div key={step} className="flex items-center">
              <div className={getStepClasses(step)}>
                {status === 'completed' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <span>{step}</span>
                )}
              </div>
              
              {/* Connector line (not for last step) */}
              {step < totalSteps && (
                <div className={getConnectorClasses(step)} />
              )}
            </div>
          );
        })}
      </div>

      {/* Current step info */}
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600">
          Step {currentStep} of {totalSteps}
        </p>
        {!canProceed(currentStep) && currentStep < totalSteps && (
          <p className="text-xs text-orange-600 mt-1">
            Complete this step to continue
          </p>
        )}
      </div>
    </div>
  );
}