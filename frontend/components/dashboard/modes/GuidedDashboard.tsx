'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp,
  Target,
  BookOpen,
  Clock,
  Star,
  ArrowRight,
  Trophy,
  Zap,
  Calendar,
  Brain,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardMode, DashboardMode } from '@/hooks/useDashboardMode';
import { useStudyTime } from '@/hooks/useStudyTime';
import { useGamification } from '@/contexts/GamificationContext';
import { useDashboardOverview } from '@/hooks/useDashboardData';
import { useContextualHelp } from '@/hooks/useContextualHelp';
import { InlineContextualHelp } from '@/components/contextual-help/ContextualHelp';

interface GuidedDashboardProps {
  userName: string;
  currentUser?: any;
  onActionClick?: (action: any) => void;
}

export function GuidedDashboard({ userName, currentUser, onActionClick }: GuidedDashboardProps) {
  const { metrics, userStats } = useDashboardMode();
  const { weeklyStudyHours } = useStudyTime('week');
  const { userStats: gamificationStats } = useGamification();
  const { data: dashboardData } = useDashboardOverview();
  const { contextualTips, dismissTip } = useContextualHelp(DashboardMode.GUIDED);
  
  // Smart greeting based on user progress and time
  const getSmartGreeting = () => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const totalXP = userStats?.total_xp || 0;
    const streak = gamificationStats?.current_streak || 0;
    
    if (streak >= 3) {
      return `${timeGreeting}, ${userName}! Your ${streak}-day streak is impressive! 🔥`;
    } else if (totalXP >= 50) {
      return `${timeGreeting}, ${userName}! You're gaining momentum! 💪`;
    } else {
      return `${timeGreeting}, ${userName}! Ready to make progress today? ⭐`;
    }
  };
  
  // Generate personalized tip based on user behavior
  const getPersonalizedTip = () => {
    const totalXP = userStats?.total_xp || 0;
    const courseCount = metrics.coursesCount;
    const studyTime = weeklyStudyHours;
    
    if (courseCount === 0) {
      return "Start by adding your first course - it unlocks AI-powered content suggestions!";
    } else if (studyTime < 1) {
      return "Try a 15-minute focused study session - small steps lead to big achievements!";
    } else if (totalXP < 25) {
      return "Each study session earns XP - aim for 25 XP to unlock personalized recommendations!";
    } else {
      return "You're building great habits! Consistency is the key to mastering any subject.";
    }
  };

  // Calculate progress toward next milestone
  const nextMilestones = [
    {
      id: 'first-100-xp',
      title: 'Reach 100 XP',
      description: 'Unlock AI study recommendations',
      current: userStats?.total_xp || 0,
      target: 100,
      reward: 'AI Features',
      icon: Brain,
      color: 'purple'
    },
    {
      id: 'three-courses',
      title: 'Add 3 Courses',
      description: 'Unlock advanced analytics',
      current: metrics.coursesCount,
      target: 3,
      reward: 'Analytics Dashboard',
      icon: BookOpen,
      color: 'blue'
    },
    {
      id: 'five-hour-week',
      title: 'Study 5 Hours This Week',
      description: 'Unlock smart scheduling',
      current: weeklyStudyHours,
      target: 5,
      reward: 'Smart Schedule',
      icon: Calendar,
      color: 'green'
    },
    {
      id: 'seven-day-streak',
      title: 'Build 7-Day Streak',
      description: 'Unlock leaderboards',
      current: gamificationStats?.current_streak || 0,
      target: 7,
      reward: 'Community Features',
      icon: Trophy,
      color: 'yellow'
    }
  ];

  // Filter to show only relevant milestones (not yet achieved)
  const activeMilestones = nextMilestones.filter(m => m.current < m.target).slice(0, 2);

  // Calculate overall progress toward next stage
  const progressToActiveStage = () => {
    const xpProgress = Math.min((userStats?.total_xp || 0) / 100, 1) * 25;
    const coursesProgress = Math.min(metrics.coursesCount / 3, 1) * 25;
    const studyProgress = Math.min(weeklyStudyHours / 5, 1) * 25;
    const streakProgress = Math.min((gamificationStats?.current_streak || 0) / 7, 1) * 25;
    
    return Math.round(xpProgress + coursesProgress + studyProgress + streakProgress);
  };

  const encouragementMessages = [
    "You're off to a great start! 🌟",
    "Building momentum, one session at a time! 💪",
    "Every expert was once a beginner! 🚀",
    "You're creating excellent learning habits! ⭐",
    "Progress over perfection - you're doing amazing! 🎯"
  ];

  const getRandomEncouragement = () => {
    return encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
  };

  const getColorClasses = (color: string) => {
    const colors = {
      purple: 'text-purple-600 bg-purple-100 border-purple-200',
      blue: 'text-blue-600 bg-blue-100 border-blue-200',
      green: 'text-green-600 bg-green-100 border-green-200',
      yellow: 'text-yellow-600 bg-yellow-100 border-yellow-200'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Hero Encouragement Section */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-0 shadow-lg">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            
            <h1 className="text-3xl font-bold mb-2">
              {getSmartGreeting()}
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              {getPersonalizedTip()}
            </p>

            {/* Progress to Next Stage */}
            <div className="bg-white rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress to Active Learner</span>
                <span className="text-xl font-bold text-primary">{progressToActiveStage()}%</span>
              </div>
              <Progress value={progressToActiveStage()} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">
                Keep building momentum to unlock advanced features!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simple Progress Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* XP Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Experience Points
                </span>
                <span className="font-bold text-yellow-600">
                  {userStats?.total_xp || 0} XP
                </span>
              </div>
              {(userStats?.total_xp || 0) < 100 && (
                <div className="text-xs text-muted-foreground">
                  {100 - (userStats?.total_xp || 0)} XP to unlock AI features
                </div>
              )}
            </div>

            {/* Courses */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  Courses Added
                </span>
                <span className="font-bold text-blue-600">
                  {metrics.coursesCount}
                </span>
              </div>
              {metrics.coursesCount < 3 && (
                <div className="text-xs text-muted-foreground">
                  Add {3 - metrics.coursesCount} more to unlock analytics
                </div>
              )}
            </div>

            {/* Study Time */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-500" />
                  This Week
                </span>
                <span className="font-bold text-green-600">
                  {weeklyStudyHours.toFixed(1)}h
                </span>
              </div>
              {weeklyStudyHours < 5 && (
                <div className="text-xs text-muted-foreground">
                  {(5 - weeklyStudyHours).toFixed(1)}h more for smart scheduling
                </div>
              )}
            </div>

            {/* Streak */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-orange-500" />
                  Study Streak
                </span>
                <span className="font-bold text-orange-600">
                  {gamificationStats?.current_streak || 0} days
                </span>
              </div>
              {(gamificationStats?.current_streak || 0) < 7 && (
                <div className="text-xs text-muted-foreground">
                  {7 - (gamificationStats?.current_streak || 0)} days to unlock community
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Next Milestones */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Next Milestones
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Achieve these goals to unlock new features
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeMilestones.map((milestone) => {
              const IconComponent = milestone.icon;
              const progress = Math.min((milestone.current / milestone.target) * 100, 100);
              const isCompleted = milestone.current >= milestone.target;
              
              return (
                <div
                  key={milestone.id}
                  className={cn(
                    "p-4 rounded-lg border",
                    isCompleted 
                      ? "bg-green-50 border-green-200" 
                      : "bg-white border-gray-200"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-2 rounded-full",
                      isCompleted 
                        ? "bg-green-500 text-white" 
                        : getColorClasses(milestone.color)
                    )}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <IconComponent className="w-5 h-5" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{milestone.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {milestone.reward}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {milestone.description}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress</span>
                          <span className="font-medium">
                            {milestone.current}/{milestone.target}
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Encouragement and Next Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Encouragement Card */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500 rounded-full">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900 mb-1">
                  {(gamificationStats?.current_streak || 0) >= 3 
                    ? `Amazing ${gamificationStats.current_streak}-day streak! 🔥`
                    : (userStats?.total_xp || 0) >= 25
                    ? 'You\'re Building Great Habits! 🌱'
                    : 'Every Start is Special! ✨'
                  }
                </h3>
                <p className="text-sm text-green-700">
                  {(userStats?.total_xp || 0) >= 25
                    ? 'Every session counts toward your learning goals. Keep up the momentum!'
                    : 'Your learning journey starts with the first step. You\'ve got this!'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Action */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  Ready for Your Next Session? 📚
                </h3>
                <p className="text-sm text-blue-700">
                  Continue building your streak and earning XP
                </p>
              </div>
              <Button
                onClick={() => window.location.href = '/my-courses'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Study Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contextual Help Tips */}
      {contextualTips.length > 0 && (
        <InlineContextualHelp
          tips={contextualTips}
          onDismiss={dismissTip}
          showTitle={true}
        />
      )}

      {/* Tips for Success */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Tips for Success
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-purple-50">
              <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Consistency Wins</h4>
              <p className="text-sm text-muted-foreground">
                20 minutes daily beats 3 hours once a week
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-50">
              <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Set Small Goals</h4>
              <p className="text-sm text-muted-foreground">
                Break big topics into manageable chunks
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50">
              <Trophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Celebrate Progress</h4>
              <p className="text-sm text-muted-foreground">
                Acknowledge every milestone, no matter how small
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}