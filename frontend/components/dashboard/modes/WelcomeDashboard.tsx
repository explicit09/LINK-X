'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  User, 
  BookOpen, 
  Play, 
  CheckCircle, 
  ArrowRight,
  Target,
  Trophy,
  Brain,
  Calendar,
  BarChart3,
  Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardMode, DashboardMode } from '@/hooks/useDashboardMode';
import { useGamification } from '@/contexts/GamificationContext';
import { useDashboardOverview } from '@/hooks/useDashboardData';
import { useContextualHelp } from '@/hooks/useContextualHelp';
import { InlineContextualHelp } from '@/components/contextual-help/ContextualHelp';

interface WelcomeDashboardProps {
  userName: string;
  currentUser?: any;
  onActionClick?: (action: any) => void;
}

export function WelcomeDashboard({ userName, currentUser, onActionClick }: WelcomeDashboardProps) {
  const { setupMissions, missionProgress, metrics } = useDashboardMode();
  const { userStats } = useGamification();
  const { data: dashboardData } = useDashboardOverview();
  const { contextualTips, dismissTip } = useContextualHelp(DashboardMode.WELCOME);
  const [showPreview, setShowPreview] = useState(false);
  
  // Generate personalized welcome message based on time and user progress
  const getPersonalizedGreeting = () => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    
    if (missionProgress.percentage === 0) {
      return `${timeGreeting}, ${userName}! Ready to begin your learning adventure? 🚀`;
    } else if (missionProgress.percentage < 50) {
      return `${timeGreeting}, ${userName}! You're off to a great start! 💪`;
    } else {
      return `${timeGreeting}, ${userName}! Almost there - let's finish your setup! ⭐`;
    }
  };
  
  // Generate smart motivation based on user state
  const getMotivationalMessage = () => {
    const totalXP = userStats?.total_xp || 0;
    const courseCount = dashboardData?.totalCourses || 0;
    
    if (totalXP === 0 && courseCount === 0) {
      return "Every expert was once a beginner. Your learning journey starts here!";
    } else if (totalXP > 0) {
      return `You've already earned ${totalXP} XP! Let's keep that momentum going.`;
    } else if (courseCount > 0) {
      return `Great! You have ${courseCount} course${courseCount > 1 ? 's' : ''} ready. Time to start learning!`;
    }
    return "Welcome to your personalized learning experience!";
  };

  const getIconComponent = (iconName: string) => {
    const icons = {
      user: User,
      book: BookOpen,
      play: Play
    };
    return icons[iconName as keyof typeof icons] || User;
  };

  const previewFeatures = [
    {
      icon: Brain,
      title: 'AI Study Assistant',
      description: 'Get personalized help with any topic',
      color: 'text-purple-600 bg-purple-100'
    },
    {
      icon: BarChart3,
      title: 'Progress Analytics',
      description: 'Track your learning journey in detail',
      color: 'text-blue-600 bg-blue-100'
    },
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description: 'AI-optimized study schedule',
      color: 'text-green-600 bg-green-100'
    },
    {
      icon: Trophy,
      title: 'Achievements & XP',
      description: 'Gamified learning experience',
      color: 'text-yellow-600 bg-yellow-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Hero Welcome Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0 shadow-lg">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-10 h-10 text-white" />
              </div>
              {missionProgress.percentage > 0 && (
                <div className="absolute -top-2 -right-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {missionProgress.percentage}%
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <h1 className="text-3xl font-bold mb-2">
              {getPersonalizedGreeting()}
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              {getMotivationalMessage()}
            </p>

            {/* Quick Stats Preview */}
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{metrics.coursesCount}</div>
                <div className="text-xs text-muted-foreground">Courses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{missionProgress.earnedXP}</div>
                <div className="text-xs text-muted-foreground">XP Earned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{missionProgress.completed}/3</div>
                <div className="text-xs text-muted-foreground">Setup Done</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Setup Missions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Setup Missions
              <Badge variant="secondary">{missionProgress.completed}/{missionProgress.total}</Badge>
            </CardTitle>
            <div className="space-y-2">
              <Progress value={missionProgress.percentage} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Complete these missions to unlock your full dashboard • {missionProgress.earnedXP}/{missionProgress.totalXP} XP
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {setupMissions.map((mission) => {
              const IconComponent = getIconComponent(mission.icon);
              
              return (
                <div
                  key={mission.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border transition-all",
                    mission.completed 
                      ? "bg-green-50 border-green-200" 
                      : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer"
                  )}
                  onClick={mission.completed ? undefined : mission.action}
                >
                  <div className={cn(
                    "p-2 rounded-full flex-shrink-0",
                    mission.completed 
                      ? "bg-green-500 text-white" 
                      : "bg-blue-100 text-blue-600"
                  )}>
                    {mission.completed ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <IconComponent className="w-5 h-5" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn(
                        "font-semibold",
                        mission.completed ? "text-green-700" : "text-gray-900"
                      )}>
                        {mission.title}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        +{mission.xp} XP
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {mission.description}
                    </p>
                  </div>
                  
                  {!mission.completed && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Preview Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              What You'll Unlock
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Here's a preview of your personalized learning dashboard
            </p>
          </CardHeader>
          <CardContent>
            {/* Mini Dashboard Preview */}
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border-2 border-dashed border-gray-300">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-700">Weekly Progress</h4>
                  <div className="text-2xl font-bold text-gray-400">85%</div>
                </div>
                <Progress value={85} className="h-2 mb-2" />
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-sm font-bold text-gray-400">1.2k/2k</div>
                    <div className="text-xs text-gray-500">XP</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-400">8/12</div>
                    <div className="text-xs text-gray-500">Tasks</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-400">15.5h</div>
                    <div className="text-xs text-gray-500">Study</div>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground mb-4">
                {missionProgress.percentage === 0 
                  ? "Complete your first mission to see real data here! 👆"
                  : missionProgress.percentage < 100
                  ? `${100 - missionProgress.percentage}% left to unlock your full dashboard! 👆`
                  : "Your personalized dashboard is ready! 🎉"
                }
              </div>

              {/* Feature Preview */}
              <div className="grid grid-cols-2 gap-3">
                {previewFeatures.map((feature, index) => (
                  <div key={index} className="text-center p-3 rounded-lg bg-gray-50 border">
                    <div className={cn("w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center", feature.color)}>
                      <feature.icon className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-semibold mb-1">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>

              <Button 
                className="w-full mt-4"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Hide' : 'Show'} Full Preview
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Steps CTA */}
      {missionProgress.percentage < 100 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  Your Next Step: {setupMissions.find(m => !m.completed)?.title}
                </h3>
                <p className="text-sm text-blue-700">
                  {setupMissions.find(m => !m.completed)?.description}
                </p>
              </div>
              <Button
                onClick={setupMissions.find(m => !m.completed)?.action}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Continue Setup
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contextual Help Tips */}
      {contextualTips.length > 0 && (
        <InlineContextualHelp
          tips={contextualTips}
          onDismiss={dismissTip}
          filterTypes={['info', 'celebration']}
          showTitle={false}
        />
      )}

      {/* Completion Celebration */}
      {missionProgress.percentage === 100 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-green-900 mb-2">
              🎉 Setup Complete! Welcome to LEARN-X!
            </h3>
            <p className="text-green-700 mb-4">
              You've earned {missionProgress.totalXP} XP and unlocked your personalized dashboard
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-green-600 hover:bg-green-700"
            >
              Explore Your Dashboard
              <Sparkles className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}