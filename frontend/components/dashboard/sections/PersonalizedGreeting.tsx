'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  UserJourneyStage, 
  useUserJourneyStage 
} from '@/hooks/useUserJourneyStage';
import {
  Sparkles,
  Zap,
  Trophy,
  Target,
  Rocket,
  ChevronRight,
  Clock,
  TrendingUp,
  Award
} from 'lucide-react';

interface PersonalizedGreetingProps {
  userName?: string;
  onActionClick?: (action: string) => void;
}

export function PersonalizedGreeting({ userName = 'there', onActionClick }: PersonalizedGreetingProps) {
  const { stage, metrics, progressToNextStage, nextStageRequirements, personalizationLevel } = useUserJourneyStage();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    
    switch (stage) {
      case UserJourneyStage.FIRST_VISIT:
        return {
          title: `Welcome to LEARN-X, ${userName}! 🎉`,
          subtitle: "Let's get you set up for success",
          icon: <Sparkles className="h-6 w-6 text-purple-600" />,
          color: 'purple'
        };
        
      case UserJourneyStage.ONBOARDED:
        return {
          title: `${timeGreeting}, ${userName}!`,
          subtitle: "Your profile looks great! Time to add your first course",
          icon: <Rocket className="h-6 w-6 text-blue-600" />,
          color: 'blue'
        };
        
      case UserJourneyStage.GETTING_STARTED:
        return {
          title: `${timeGreeting}, ${userName}!`,
          subtitle: `Your focus peaks in ${metrics.streakDays > 0 ? metrics.streakDays : '45'} mins`,
          icon: <Target className="h-6 w-6 text-green-600" />,
          color: 'green'
        };
        
      case UserJourneyStage.ACTIVE_LEARNER:
        if (metrics.lastActivityDays > 3) {
          return {
            title: `Welcome back, ${userName}! 🌟`,
            subtitle: `You were last here ${metrics.lastActivityDays} days ago. Ready to continue?`,
            icon: <Clock className="h-6 w-6 text-orange-600" />,
            color: 'orange'
          };
        }
        return {
          title: `${timeGreeting}, ${userName}!`,
          subtitle: `${metrics.streakDays} day streak! Keep the momentum going`,
          icon: <Zap className="h-6 w-6 text-yellow-600" />,
          color: 'yellow'
        };
        
      case UserJourneyStage.POWER_USER:
        return {
          title: `${timeGreeting}, ${userName}! 🏆`,
          subtitle: `Power learner with ${metrics.totalXP} XP earned!`,
          icon: <Trophy className="h-6 w-6 text-gold-600" />,
          color: 'gold'
        };
        
      default:
        return {
          title: `${timeGreeting}, ${userName}!`,
          subtitle: "Ready to learn something new today?",
          icon: <Sparkles className="h-6 w-6 text-gray-600" />,
          color: 'gray'
        };
    }
  };

  const getStageInfo = () => {
    switch (stage) {
      case UserJourneyStage.FIRST_VISIT:
        return { label: '🌱 New Learner', color: 'bg-purple-100 text-purple-700' };
      case UserJourneyStage.ONBOARDED:
        return { label: '🚀 Ready to Start', color: 'bg-blue-100 text-blue-700' };
      case UserJourneyStage.GETTING_STARTED:
        return { label: '📚 Getting Started', color: 'bg-green-100 text-green-700' };
      case UserJourneyStage.ACTIVE_LEARNER:
        return { label: '⚡ Active Learner', color: 'bg-yellow-100 text-yellow-700' };
      case UserJourneyStage.POWER_USER:
        return { label: '🏆 Power User', color: 'bg-gold-100 text-gold-700' };
      default:
        return { label: 'Learner', color: 'bg-gray-100 text-gray-700' };
    }
  };

  const greeting = getGreeting();
  const stageInfo = getStageInfo();

  return (
    <div className="space-y-4">
      {/* Main Greeting Card */}
      <Card className={`border-2 border-${greeting.color}-100 bg-gradient-to-r from-${greeting.color}-50/30 to-white`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-full bg-${greeting.color}-100`}>
                {greeting.icon}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {greeting.title}
                </h1>
                <p className="text-gray-600">
                  {greeting.subtitle}
                </p>
              </div>
            </div>
            <Badge className={stageInfo.color}>
              {stageInfo.label}
            </Badge>
          </div>

          {/* Progress to Next Stage (not for power users) */}
          {stage !== UserJourneyStage.POWER_USER && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Progress to next level</span>
                <span className="font-medium text-gray-900">{progressToNextStage}%</span>
              </div>
              <Progress value={progressToNextStage} className="h-2" />
              {nextStageRequirements.length > 0 && (
                <div className="space-y-1">
                  {nextStageRequirements.map((req, idx) => (
                    <div key={idx} className="flex items-center text-xs text-gray-600">
                      <ChevronRight className="h-3 w-3 mr-1" />
                      {req}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Personalization Level Indicator */}
          {personalizationLevel < 100 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-700">
                  AI Personalization Level
                </span>
                <span className="text-xs text-blue-600">{personalizationLevel}%</span>
              </div>
              <Progress value={personalizationLevel} className="h-1.5 bg-blue-100" />
              <p className="text-xs text-blue-600 mt-1">
                {personalizationLevel < 50 
                  ? 'Add more data to unlock personalized recommendations'
                  : personalizationLevel < 80
                  ? 'Getting better! Keep learning for more accurate suggestions'
                  : 'Great! AI is learning your patterns'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Contextual Action Button */}
      {stage === UserJourneyStage.ONBOARDED && (
        <div className="flex justify-center">
          <Button 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => onActionClick?.('add-course')}
          >
            <Rocket className="h-4 w-4 mr-2" />
            Add Your First Course
          </Button>
        </div>
      )}
    </div>
  );
}