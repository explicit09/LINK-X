/**
 * Schedule Onboarding Modal - 3-step session creation
 * Auto-launches on first visit to guide users through creating their first session
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ScheduleOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (sessionData: {
    course: string;
    duration: string;
    timeSlot: string;
    title?: string;
  }) => void;
  userCourses: any[];
}

type Step = 'course' | 'duration' | 'time';

export function ScheduleOnboardingModal({
  isOpen,
  onClose,
  onComplete,
  userCourses
}: ScheduleOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('course');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  if (!isOpen) return null;

  const steps: Step[] = ['course', 'duration', 'time'];
  const currentStepIndex = steps.indexOf(currentStep);

  const durations = [
    { value: '25m', label: '25 minutes', subtitle: 'Perfect focus block' },
    { value: '50m', label: '50 minutes', subtitle: 'Deep work session' },
    { value: '1h 30m', label: '90 minutes', subtitle: 'Full concentration' },
    { value: '2h', label: '2 hours', subtitle: 'Project work' },
  ];

  const timeSlots = [
    { value: '9:00 AM', label: '9:00 AM', subtitle: 'Morning focus' },
    { value: '11:00 AM', label: '11:00 AM', subtitle: 'Mid-morning' },
    { value: '2:00 PM', label: '2:00 PM', subtitle: 'After lunch' },
    { value: '4:00 PM', label: '4:00 PM', subtitle: 'Afternoon boost' },
    { value: '7:00 PM', label: '7:00 PM', subtitle: 'Evening study' },
  ];

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1]);
    } else {
      // Final step - create session
      const sessionData = {
        course: selectedCourse,
        duration: selectedDuration,
        timeSlot: selectedTimeSlot,
        title: `Study Session - ${selectedCourse}`
      };
      
      console.log('📝 Onboarding Complete - Session Data:', sessionData);
      onComplete(sessionData);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'course': return selectedCourse !== '';
      case 'duration': return selectedDuration !== '';
      case 'time': return selectedTimeSlot !== '';
      default: return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'course':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Pick your course
              </h3>
              <p className="text-gray-600">
                What would you like to study today?
              </p>
            </div>

            <div className="space-y-3">
              {userCourses.length > 0 ? (
                userCourses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourse(course.id)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      selectedCourse === course.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">
                      {course.title || course.name}
                    </div>
                    {course.code && (
                      <div className="text-sm text-gray-500">{course.code}</div>
                    )}
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No courses found</p>
                  <Button variant="outline" onClick={() => window.location.href = '/my-courses'}>
                    Add Your First Course
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      case 'duration':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Pick your duration
              </h3>
              <p className="text-gray-600">
                How long do you want to study?
              </p>
            </div>

            <div className="space-y-3">
              {durations.map((duration) => (
                <button
                  key={duration.value}
                  onClick={() => setSelectedDuration(duration.value)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedDuration === duration.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">
                    {duration.label}
                  </div>
                  <div className="text-sm text-gray-500">{duration.subtitle}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'time':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Pick your time slot
              </h3>
              <p className="text-gray-600">
                When do you want to start?
              </p>
            </div>

            <div className="space-y-3">
              {timeSlots.map((slot) => (
                <button
                  key={slot.value}
                  onClick={() => setSelectedTimeSlot(slot.value)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedTimeSlot === slot.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">
                    {slot.label}
                  </div>
                  <div className="text-sm text-gray-500">{slot.subtitle}</div>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Create Your First Session
            </h2>
            <div className="text-sm text-gray-500 mt-1">
              Step {currentStepIndex + 1} of {steps.length}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-2 rounded-full ${
                  index <= currentStepIndex ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {currentStepIndex === steps.length - 1 ? (
              'Create Session 🎯'
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}