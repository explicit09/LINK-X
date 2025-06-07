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
  
  // Use real data when available, fallback to defaults
  const weeklyProgress = dashboardData?.weekly_progress || {
    overall: overallProgress,
    xp: { current: weeklyXPCurrent, target: weeklyXPTarget },
    tasks: { completed: 8, total: 12 }, // TODO: Replace with real task data
    study_time: { current: weeklyStudyHours, target: weeklyStudyTarget }
  };

  const priorityActions = dashboardData?.priority_actions || [
    {
      id: 'focus-session',
      title: 'Deep Focus Session',
      description: 'Complete Chapter 5 of Data Structures',
      urgency: 'urgent',
      time_estimate: '45 min',
      type: 'study',
      course: 'CS201'
    },
    {
      id: 'quick-tutorial',
      title: 'Quick Review',
      description: 'Watch video on Binary Trees',
      urgency: 'high',
      time_estimate: '15 min',
      type: 'video',
      course: 'CS201'
    }
  ];

  const performancePulse = dashboardData?.performance_pulse || {
    improvement_percentage: 12,
    current_rank: 15,
    rank_change: 3,
    average_score: 85
  };

  const defaultRecommendations: AIRecommendation[] = aiRecommendations || [
    {
      id: '1',
      title: 'Adaptive Learning Path',
      description: 'AI-optimized study sequence based on your progress',
      icon: 'brain',
      action: 'Start Adaptive Session',
      xp_reward: 250,
      estimated_time: '30 min'
    },
    {
      id: '2',
      title: 'Concept Reinforcement',
      description: 'Strengthen weak areas identified by AI',
      icon: 'target',
      action: 'Practice Now',
      xp_reward: 150,
      estimated_time: '20 min'
    }
  ];

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