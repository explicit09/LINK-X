import { useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';

export interface OnboardingStep {
  id: string;
  name: string;
  completed: boolean;
  completedAt?: string;
  data?: any;
}

export interface OnboardingProgress {
  steps: OnboardingStep[];
  currentStep: string;
  completionPercentage: number;
  startedAt: string;
  completedAt?: string;
  timeSpent: number; // in seconds
  abandoned: boolean;
}

export function useOnboardingTracking() {
  const ONBOARDING_STEPS = [
    { id: 'personal_info', name: 'Personal Information' },
    { id: 'learning_style', name: 'Learning Style' },
    { id: 'preferences', name: 'Study Preferences' },
    { id: 'interests', name: 'Academic Interests' },
    { id: 'first_course', name: 'Add First Course' },
    { id: 'first_mission', name: 'Complete First Mission' }
  ];

  const getProgress = useCallback((): OnboardingProgress => {
    const stored = localStorage.getItem('onboarding_progress');
    if (stored) {
      return JSON.parse(stored);
    }

    return {
      steps: ONBOARDING_STEPS.map(step => ({
        id: step.id,
        name: step.name,
        completed: false
      })),
      currentStep: 'personal_info',
      completionPercentage: 0,
      startedAt: new Date().toISOString(),
      timeSpent: 0,
      abandoned: false
    };
  }, []);

  const updateProgress = useCallback((updates: Partial<OnboardingProgress>) => {
    const current = getProgress();
    const updated = { ...current, ...updates };
    
    // Recalculate completion percentage
    const completedSteps = updated.steps.filter(s => s.completed).length;
    updated.completionPercentage = Math.round((completedSteps / updated.steps.length) * 100);
    
    // Check if fully completed
    if (updated.completionPercentage === 100 && !updated.completedAt) {
      updated.completedAt = new Date().toISOString();
    }
    
    localStorage.setItem('onboarding_progress', JSON.stringify(updated));
    
    // Sync with backend (commented out until endpoint is implemented)
    // apiClient.post('/api/v2/auth/onboarding-progress', updated).catch(console.error);
    
    return updated;
  }, [getProgress]);

  const markStepCompleted = useCallback((stepId: string, data?: any) => {
    const progress = getProgress();
    const stepIndex = progress.steps.findIndex(s => s.id === stepId);
    
    if (stepIndex === -1) return progress;
    
    progress.steps[stepIndex].completed = true;
    progress.steps[stepIndex].completedAt = new Date().toISOString();
    if (data) {
      progress.steps[stepIndex].data = data;
    }
    
    // Move to next incomplete step
    const nextIncompleteStep = progress.steps.find(s => !s.completed);
    if (nextIncompleteStep) {
      progress.currentStep = nextIncompleteStep.id;
    }
    
    return updateProgress(progress);
  }, [getProgress, updateProgress]);

  const trackTimeSpent = useCallback(() => {
    const progress = getProgress();
    const startTime = new Date(progress.startedAt).getTime();
    const currentTime = new Date().getTime();
    const timeSpent = Math.round((currentTime - startTime) / 1000);
    
    updateProgress({ timeSpent });
  }, [getProgress, updateProgress]);

  const abandonOnboarding = useCallback((reason?: string) => {
    const progress = getProgress();
    updateProgress({ 
      abandoned: true,
      abandonedAt: new Date().toISOString(),
      abandonReason: reason
    } as any);
    
    // Track abandonment analytics (commented out until endpoint is implemented)
    // apiClient.post('/api/v2/analytics/track', {
    //   event: 'onboarding_abandoned',
    //   properties: {
    //     step: progress.currentStep,
    //     completion_percentage: progress.completionPercentage,
    //     time_spent: progress.timeSpent,
    //     reason
    //   }
    // }).catch(console.error);
  }, [getProgress, updateProgress]);

  const getStepRecommendations = useCallback((stepId: string) => {
    const recommendations: Record<string, string[]> = {
      personal_info: [
        'Your name helps us personalize your experience',
        'Academic level ensures content matches your needs',
        'Time zone helps schedule study sessions'
      ],
      learning_style: [
        'Visual learners benefit from diagrams and videos',
        'Auditory learners excel with lectures and discussions',
        'Kinesthetic learners need hands-on practice'
      ],
      preferences: [
        'Set realistic daily study goals',
        'Morning sessions often have better retention',
        'Short, frequent sessions beat long cramming'
      ],
      interests: [
        'We\'ll recommend courses in your areas of interest',
        'Connect with peers studying similar subjects',
        'Get personalized content recommendations'
      ]
    };
    
    return recommendations[stepId] || [];
  }, []);

  // Auto-save progress every 30 seconds
  useEffect(() => {
    const interval = setInterval(trackTimeSpent, 30000);
    return () => clearInterval(interval);
  }, [trackTimeSpent]);

  // Track page visibility to detect abandonment
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackTimeSpent();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [trackTimeSpent]);

  return {
    getProgress,
    updateProgress,
    markStepCompleted,
    abandonOnboarding,
    getStepRecommendations,
    ONBOARDING_STEPS
  };
}

// Helper hook for onboarding analytics
export function useOnboardingAnalytics() {
  const trackEvent = useCallback((eventName: string, properties?: any) => {
    // Analytics tracking (commented out until endpoint is implemented)
    console.log('Analytics event:', `onboarding_${eventName}`, properties);
    // apiClient.post('/api/v2/analytics/track', {
    //   event: `onboarding_${eventName}`,
    //   properties: {
    //     ...properties,
    //     timestamp: new Date().toISOString(),
    //     session_id: sessionStorage.getItem('onboarding_session_id') || 
    //                sessionStorage.setItem('onboarding_session_id', Math.random().toString(36).substr(2, 9))
    //   }
    // }).catch(console.error);
  }, []);

  const trackStepView = useCallback((stepId: string) => {
    trackEvent('step_viewed', { step_id: stepId });
  }, [trackEvent]);

  const trackStepCompleted = useCallback((stepId: string, timeSpent: number) => {
    trackEvent('step_completed', { 
      step_id: stepId, 
      time_spent_seconds: timeSpent 
    });
  }, [trackEvent]);

  const trackFieldInteraction = useCallback((stepId: string, fieldName: string) => {
    trackEvent('field_interacted', { 
      step_id: stepId, 
      field_name: fieldName 
    });
  }, [trackEvent]);

  const trackHelpUsed = useCallback((stepId: string, helpType: string) => {
    trackEvent('help_used', { 
      step_id: stepId, 
      help_type: helpType 
    });
  }, [trackEvent]);

  return {
    trackStepView,
    trackStepCompleted,
    trackFieldInteraction,
    trackHelpUsed,
    trackEvent
  };
}