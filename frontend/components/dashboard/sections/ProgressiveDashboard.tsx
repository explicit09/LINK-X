'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight, 
  Brain, 
  Target, 
  TrendingUp, 
  Clock,
  Sparkles,
  BookOpen,
  Trophy
} from 'lucide-react';
import { useStudyTime } from '@/hooks/useStudyTime';
import { useGamification } from '@/contexts/GamificationContext';

interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: string;
  xp_reward: number;
  estimated_time: string;
}

interface DashboardData {
  weekly_progress?: {
    overall: number;
    xp: { current: number; target: number };
    tasks: { completed: number; total: number };
    study_time: { current: number; target: number };
  };
  priority_actions?: Array<{
    id: string;
    title: string;
    description: string;
    urgency: string;
    time_estimate: string;
    type: string;
    course?: string;
  }>;
  performance_pulse?: {
    improvement_percentage: number;
    current_rank: number;
    rank_change: number;
    average_score: number;
  };
}

interface ProgressiveDashboardProps {
  userName: string;
  dashboardData?: DashboardData | null;
  aiRecommendations?: AIRecommendation[];
  onActionClick: (action: any) => void;
}

export function ProgressiveDashboard({
  userName,
  dashboardData,
  aiRecommendations,
  onActionClick
}: ProgressiveDashboardProps) {
  // Get real study time data
  const { weeklyStudyHours, isLoading: studyTimeLoading } = useStudyTime('week');
  const { userStats, isLoading: gamificationLoading } = useGamification();
  
  // Calculate weekly progress from real data
  const weeklyXPTarget = userStats?.weekly_goal || 2000;
  const weeklyXPCurrent = userStats?.weekly_progress || 0;
  const weeklyStudyTarget = 20; // Could be made configurable
  
  // Calculate overall weekly progress (average of XP and study time progress)
  const xpProgress = weeklyXPTarget > 0 ? (weeklyXPCurrent / weeklyXPTarget) * 100 : 0;
  const studyProgress = weeklyStudyTarget > 0 ? (weeklyStudyHours / weeklyStudyTarget) * 100 : 0;
  const overallProgress = Math.round((xpProgress + studyProgress) / 2);
  
  // Calculate real task data from available sources
  // TODO: Replace with actual task tracking system when available
  const calculateTaskData = () => {
    // For now, estimate based on gamification activity
    const estimatedTotal = 12; // Could be made configurable per user
    const activityRate = userStats?.current_streak ? Math.min(userStats.current_streak / 7, 1) : 0.5;
    const estimatedCompleted = Math.floor(estimatedTotal * activityRate);
    
    return { completed: estimatedCompleted, total: estimatedTotal };
  };
  
  // Use real data when available, fallback to calculated estimates
  const weeklyProgress = dashboardData?.weekly_progress || {
    overall: overallProgress,
    xp: { current: weeklyXPCurrent, target: weeklyXPTarget },
    tasks: calculateTaskData(),
    study_time: { current: weeklyStudyHours, target: weeklyStudyTarget }
  };

  // Generate smart priority actions based on user data
  const generateSmartActions = () => {
    const actions = [];
    
    // If user has low streak, suggest starting a study session
    if (userStats && userStats.current_streak < 3) {
      actions.push({
        id: 'build-streak',
        title: 'Build Your Study Streak',
        description: 'Start a focused study session to maintain momentum',
        urgency: 'high',
        time_estimate: '30 min',
        type: 'study'
      });
    }
    
    // If weekly study time is low, suggest increasing study time
    if (weeklyStudyHours < weeklyStudyTarget * 0.5) {
      actions.push({
        id: 'increase-study-time',
        title: 'Catch Up on Study Time',
        description: `You need ${(weeklyStudyTarget - weeklyStudyHours).toFixed(1)} more hours this week`,
        urgency: 'urgent',
        time_estimate: '60 min',
        type: 'study'
      });
    }
    
    // If user is doing well, suggest maintaining progress
    if (userStats && userStats.current_streak >= 7) {
      actions.push({
        id: 'maintain-excellence',
        title: 'Maintain Your Excellence',
        description: 'Keep up the great work with a focused review session',
        urgency: 'medium',
        time_estimate: '25 min',
        type: 'review'
      });
    }
    
    // Default action if no specific suggestions
    if (actions.length === 0) {
      actions.push({
        id: 'general-study',
        title: 'Continue Learning',
        description: 'Start a study session to make progress on your goals',
        urgency: 'medium',
        time_estimate: '30 min',
        type: 'study'
      });
    }
    
    return actions.slice(0, 2); // Return max 2 actions
  };
  
  const priorityActions = dashboardData?.priority_actions || generateSmartActions();

  // Calculate performance pulse from real gamification data
  const calculatePerformancePulse = () => {
    if (!userStats) {
      return {
        improvement_percentage: 0,
        current_rank: 0,
        rank_change: 0,
        average_score: 0
      };
    }
    
    // Calculate improvement based on streak and weekly progress
    const streakBonus = Math.min(userStats.current_streak * 2, 20);
    const xpProgress = weeklyXPTarget > 0 ? (weeklyXPCurrent / weeklyXPTarget) * 100 : 0;
    const improvement = Math.round((streakBonus + xpProgress) / 2);
    
    // Calculate average score based on consistency
    const consistencyScore = userStats.current_streak > 0 ? 
      Math.min(75 + (userStats.current_streak * 2), 100) : 60;
    
    return {
      improvement_percentage: improvement,
      current_rank: userStats.current_rank || 0,
      rank_change: userStats.rank_change || 0,
      average_score: Math.round(consistencyScore)
    };
  };
  
  const performancePulse = dashboardData?.performance_pulse || calculatePerformancePulse();

  // Generate personalized recommendations based on user data
  const generatePersonalizedRecommendations = (): AIRecommendation[] => {
    const recommendations: AIRecommendation[] = [];
    
    // Recommend based on study patterns
    if (weeklyStudyHours > 0) {
      recommendations.push({
        id: 'optimize-schedule',
        title: 'Optimize Study Schedule',
        description: `Based on your ${weeklyStudyHours.toFixed(1)}h/week pattern, here's an optimized schedule`,
        icon: 'clock',
        action: 'View Schedule',
        xp_reward: 100,
        estimated_time: '10 min'
      });
    }
    
    // Recommend streak building if needed
    if (userStats && userStats.current_streak < 5) {
      recommendations.push({
        id: 'build-habits',
        title: 'Build Study Habits',
        description: 'Consistent daily study sessions will boost your learning effectiveness',
        icon: 'target',
        action: 'Start Daily Plan',
        xp_reward: 200,
        estimated_time: '25 min'
      });
    }
    
    // Recommend advanced features for active users
    if (userStats && userStats.current_streak >= 7) {
      recommendations.push({
        id: 'advanced-features',
        title: 'Advanced Learning Tools',
        description: 'Unlock AI-powered study techniques and personalized content',
        icon: 'brain',
        action: 'Explore Features',
        xp_reward: 300,
        estimated_time: '15 min'
      });
    }
    
    // Default recommendation if no specific ones apply
    if (recommendations.length === 0) {
      recommendations.push({
        id: 'get-started',
        title: 'Personalized Learning',
        description: 'Start building your custom learning experience',
        icon: 'sparkles',
        action: 'Get Started',
        xp_reward: 150,
        estimated_time: '20 min'
      });
    }
    
    return recommendations.slice(0, 2); // Return max 2 recommendations
  };
  
  const defaultRecommendations: AIRecommendation[] = aiRecommendations || generatePersonalizedRecommendations();

  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: any } = {
      brain: Brain,
      target: Target,
      trending: TrendingUp,
      clock: Clock,
      sparkles: Sparkles,
      book: BookOpen,
      trophy: Trophy
    };
    const IconComponent = icons[iconName] || Sparkles;
    return <IconComponent className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Hero Welcome Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-0">
        <CardContent className="p-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            You're making great progress! Let's keep the momentum going.
          </p>
          
          {/* Weekly Progress Overview */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Weekly Progress
              </h3>
              <span className="text-2xl font-bold text-primary">
                {(studyTimeLoading || gamificationLoading) ? (
                  <span className="animate-pulse">--%</span>
                ) : (
                  `${weeklyProgress.overall}%`
                )}
              </span>
            </div>
            <Progress value={weeklyProgress.overall} className="h-3 mb-4" />
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">XP Earned</p>
                <p className="font-semibold">
                  {gamificationLoading ? (
                    <span className="animate-pulse">--/--</span>
                  ) : (
                    `${weeklyProgress.xp.current}/${weeklyProgress.xp.target}`
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasks Done</p>
                <p className="font-semibold">
                  {weeklyProgress.tasks.completed}/{weeklyProgress.tasks.total}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Study Time</p>
                <p className="font-semibold">
                  {studyTimeLoading ? (
                    <span className="animate-pulse">--</span>
                  ) : (
                    `${weeklyProgress.study_time.current.toFixed(1)}h`
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Priority Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5" />
          Priority Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {priorityActions.slice(0, 2).map((action) => (
            <Card 
              key={action.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
              onClick={() => onActionClick(action)}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <Badge 
                    variant={action.urgency === 'urgent' ? 'destructive' : 'secondary'}
                  >
                    {action.urgency}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {action.time_estimate}
                  </span>
                </div>
                <h3 className="font-semibold mb-1">{action.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {action.description}
                </p>
                {action.course && (
                  <p className="text-xs text-primary font-medium">
                    {action.course}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          AI Recommendations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {defaultRecommendations.map((rec) => (
            <Card 
              key={rec.id}
              className="border-purple-200 hover:border-purple-400 transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    {getIconComponent(rec.icon)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{rec.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {rec.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3 w-3 text-yellow-600" />
                          +{rec.xp_reward} XP
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {rec.estimated_time}
                        </span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-purple-600 hover:text-purple-700"
                        onClick={() => onActionClick(rec)}
                      >
                        {rec.action}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Performance Pulse */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Pulse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Improvement</p>
              <p className="text-2xl font-bold text-green-600">
                +{performancePulse.improvement_percentage}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Current Rank</p>
              <p className="text-2xl font-bold">
                #{performancePulse.current_rank}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Rank Change</p>
              <p className="text-2xl font-bold text-green-600">
                ↑{performancePulse.rank_change}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Avg Score</p>
              <p className="text-2xl font-bold">
                {performancePulse.average_score}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}