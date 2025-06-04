'use client';

import React, { useEffect, useState } from 'react';
import { InteractiveGuide, SmartTip, FeatureHighlight } from '@/components/ui/contextual-help';
import { useUserJourneyStage, UserJourneyStage } from '@/hooks/useUserJourneyStage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  ChevronRight, 
  PlayCircle,
  BookOpen,
  Target,
  Trophy,
  HelpCircle
} from 'lucide-react';

interface FirstTimeUserGuideProps {
  onGuideComplete?: () => void;
}

export function FirstTimeUserGuide({ onGuideComplete }: FirstTimeUserGuideProps) {
  const { stage } = useUserJourneyStage();
  const [showWelcomeCard, setShowWelcomeCard] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    // Show welcome card for first-time users
    const hasSeenWelcome = localStorage.getItem('has_seen_welcome');
    if (!hasSeenWelcome && stage === UserJourneyStage.FIRST_VISIT) {
      setShowWelcomeCard(true);
    }
  }, [stage]);

  const dashboardTourSteps = [
    {
      target: '.dashboard-greeting',
      title: 'Welcome to Your Dashboard!',
      content: 'This is your personalized learning hub. It adapts as you progress through your learning journey.',
      position: 'bottom' as const
    },
    {
      target: '.setup-missions',
      title: 'Setup Missions',
      content: 'Complete these quick tasks to unlock your full dashboard. Each mission earns you XP!',
      position: 'bottom' as const
    },
    {
      target: '.quick-stats',
      title: 'Your Progress at a Glance',
      content: 'Track your daily streak, level, tasks completed, and more. These update in real-time!',
      position: 'top' as const
    },
    {
      target: '.add-course-button',
      title: 'Add Your First Course',
      content: 'Click here to import courses from your LMS or add them manually. This unlocks AI-powered features!',
      position: 'left' as const
    }
  ];

  const progressiveTips = [
    {
      stage: UserJourneyStage.FIRST_VISIT,
      tips: [
        {
          id: 'complete_profile',
          title: '💡 Complete Your Profile',
          content: 'A complete profile unlocks personalized AI recommendations and study plans.',
          actionLabel: 'Complete Now',
          action: () => window.location.href = '/onboarding'
        },
        {
          id: 'explore_features',
          title: '🎯 Explore Features Gradually',
          content: 'New features unlock as you progress. Focus on the basics first!',
        }
      ]
    },
    {
      stage: UserJourneyStage.GETTING_STARTED,
      tips: [
        {
          id: 'first_study_session',
          title: '📚 Start Your First Study Session',
          content: 'Open any course material and our AI will create a personalized learning experience.',
          actionLabel: 'Browse Courses',
          action: () => window.location.href = '/courses'
        },
        {
          id: 'weekly_goals',
          title: '🎯 Set Weekly Goals',
          content: 'Consistent small goals lead to big achievements. Start with 3 study sessions this week!',
        }
      ]
    },
    {
      stage: UserJourneyStage.ACTIVE_LEARNER,
      tips: [
        {
          id: 'ai_recommendations',
          title: '🤖 AI Recommendations Available',
          content: 'Based on your learning patterns, we can now suggest optimal study times and content.',
        },
        {
          id: 'study_scheduling',
          title: '📅 Smart Scheduling Unlocked',
          content: 'Schedule study sessions when you\'re most productive. We\'ve analyzed your patterns!',
          actionLabel: 'View Schedule',
          action: () => window.location.href = '/schedule'
        }
      ]
    }
  ];

  const handleWelcomeComplete = () => {
    localStorage.setItem('has_seen_welcome', 'true');
    setShowWelcomeCard(false);
  };

  const getCurrentTips = () => {
    return progressiveTips.find(t => t.stage === stage)?.tips || [];
  };

  const tips = getCurrentTips();

  return (
    <>
      {/* Welcome Card for First-Time Users */}
      {showWelcomeCard && (
        <Card className="mb-6 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <span>Welcome to LEARN-X! 🎉</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              We're excited to have you here! Let's take a quick tour to help you get started.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Personalized Learning</h4>
                  <p className="text-xs text-gray-600">AI adapts to your style</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-full bg-green-100">
                  <Target className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Track Progress</h4>
                  <p className="text-xs text-gray-600">Earn XP and level up</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-full bg-purple-100">
                  <Trophy className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Unlock Features</h4>
                  <p className="text-xs text-gray-600">Grow at your pace</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={handleWelcomeComplete}
              >
                Skip Tour
              </Button>
              <Button
                onClick={() => {
                  handleWelcomeComplete();
                  // Start interactive tour
                  const event = new CustomEvent('start-dashboard-tour');
                  window.dispatchEvent(event);
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Take Quick Tour
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interactive Dashboard Tour */}
      <InteractiveGuide
        steps={dashboardTourSteps}
        guideId="dashboard_tour_v1"
        onComplete={onGuideComplete}
      />

      {/* Progressive Tips Based on User Stage */}
      <div className="fixed bottom-4 right-4 z-30 space-y-2">
        {tips.length > 0 && currentTip < tips.length && (
          <Card className="w-80 shadow-lg animate-slide-up">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-sm">{tips[currentTip].title}</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => setCurrentTip(currentTip + 1)}
                >
                  ×
                </Button>
              </div>
              <p className="text-sm text-gray-600 mb-3">{tips[currentTip].content}</p>
              <div className="flex items-center justify-between">
                <div className="flex space-x-1">
                  {tips.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 w-1.5 rounded-full ${
                        idx === currentTip ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                {tips[currentTip].actionLabel && (
                  <Button
                    size="sm"
                    onClick={() => {
                      tips[currentTip].action?.();
                      setCurrentTip(currentTip + 1);
                    }}
                  >
                    {tips[currentTip].actionLabel}
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Help Button */}
      <div className="fixed bottom-4 left-4 z-30">
        <Button
          variant="outline"
          size="sm"
          className="shadow-lg"
          onClick={() => {
            const event = new CustomEvent('open-help-center');
            window.dispatchEvent(event);
          }}
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          Need Help?
        </Button>
      </div>
    </>
  );
}

// Feature-specific guides for different parts of the app
export function CoursePageGuide() {
  const steps = [
    {
      target: '.course-header',
      title: 'Course Overview',
      content: 'See all your course details, progress, and upcoming deadlines at a glance.',
      position: 'bottom' as const
    },
    {
      target: '.module-grid',
      title: 'Course Modules',
      content: 'Each module contains lectures, readings, and assignments. Click to explore!',
      position: 'top' as const
    },
    {
      target: '.ai-assistant-button',
      title: 'AI Study Assistant',
      content: 'Get instant help with course material. Ask questions or request summaries!',
      position: 'left' as const
    }
  ];

  return (
    <InteractiveGuide
      steps={steps}
      guideId="course_page_tour_v1"
      onComplete={() => console.log('Course tour completed')}
    />
  );
}

export function StudySessionGuide() {
  const steps = [
    {
      target: '.pdf-viewer',
      title: 'Smart Document Viewer',
      content: 'Highlight text to get AI explanations, take notes, or create flashcards.',
      position: 'right' as const
    },
    {
      target: '.ai-chat',
      title: 'AI Learning Companion',
      content: 'Ask questions about the material and get personalized explanations.',
      position: 'left' as const
    },
    {
      target: '.progress-tracker',
      title: 'Session Progress',
      content: 'Track your reading progress and time spent. Take breaks when suggested!',
      position: 'bottom' as const
    }
  ];

  return (
    <InteractiveGuide
      steps={steps}
      guideId="study_session_tour_v1"
      onComplete={() => console.log('Study session tour completed')}
    />
  );
}

// CSS for animations (add to globals.css)
const animationStyles = `
@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
`;