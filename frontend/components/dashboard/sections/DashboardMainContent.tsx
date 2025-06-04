'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  useDashboardOverview,
  useAIRecommendations,
} from '@/hooks/useDashboardData';
import { useHasData } from '@/hooks/useHasData';
import { SetupMissions } from './SetupMissions';
import { BlankStateCTA } from './BlankStateCTA';
import {
  Target,
  Zap,
  Timer,
  Brain,
  Play,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  BookOpen,
  ChevronRight,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface DashboardMainContentProps {
  onActionClick?: (action: any) => void;
  onCourseClick?: (courseId: string) => void;
  onViewProgress?: () => void;
}

export function DashboardMainContent({
  onActionClick,
  onCourseClick,
  onViewProgress,
}: DashboardMainContentProps) {
  const [completedRecommendations, setCompletedRecommendations] = useState<
    string[]
  >([]);
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);

  // Check if user has data
  const userDataStatus = useHasData();

  // Real data from API
  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
  } = useDashboardOverview();
  const { data: aiData, loading: aiLoading } = useAIRecommendations();

  // Extract data with fallbacks
  const weeklyProgress = dashboardData?.weekly_progress || {
    overall: 0,
    xp: { current: 0, target: 150 },
    tasks: { completed: 0, total: 8 },
    study_time: { current: 0, target: 12 },
  };

  const priorityActions = dashboardData?.priority_actions || [];
  const aiRecommendations = aiData?.recommendations || [];

  const handleRecommendationClick = (rec: any) => {
    setCompletedRecommendations((prev) => [...prev, rec.id]);
    onActionClick?.(rec);
  };

  const handleMissionComplete = (missionId: string) => {
    const updatedMissions = [...completedMissions, missionId];
    setCompletedMissions(updatedMissions);
    localStorage.setItem('completedSetupMissions', JSON.stringify(updatedMissions));
  };

  // Load completed missions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('completedSetupMissions');
    if (saved) {
      setCompletedMissions(JSON.parse(saved));
    }
  }, []);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  // Loading state
  if (dashboardLoading || userDataStatus.isLoading) {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-blue-100">
          <CardContent className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-gray-600">Loading your dashboard...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (dashboardError) {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-red-100">
          <CardContent className="p-8">
            <div className="text-center text-red-600">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
              <p>Failed to load dashboard data</p>
              <p className="text-sm text-gray-500 mt-1">{dashboardError}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show setup missions only for new users without historical data
  const showSetupMissions = !userDataStatus.hasHistoricalMetrics && 
                           !userDataStatus.hasCompletedMissions && 
                           completedMissions.length < 3;

  return (
    <div className="space-y-6">
      {/* Block 1: Setup Missions or This Week's Mission */}
      {showSetupMissions ? (
        <SetupMissions 
          onMissionComplete={handleMissionComplete}
          completedMissions={completedMissions}
        />
      ) : (
      <Card className="border-2 border-blue-100 bg-gradient-to-r from-blue-50/50 to-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span>This Week's Mission</span>
            </CardTitle>
            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
              {weeklyProgress.overall}% Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
              <div className="text-lg font-bold text-yellow-600">
                {weeklyProgress.xp.current}/{weeklyProgress.xp.target}
              </div>
              <div className="text-xs text-gray-600">XP Progress</div>
              <div className="text-xs text-yellow-600 font-medium">
                +{weeklyProgress.xp.target - weeklyProgress.xp.current} to go
              </div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
              <div className="text-lg font-bold text-blue-600">
                {weeklyProgress.tasks.completed}/{weeklyProgress.tasks.total}
              </div>
              <div className="text-xs text-gray-600">Tasks Done</div>
              <div className="text-xs text-blue-600 font-medium">
                {weeklyProgress.tasks.total - weeklyProgress.tasks.completed}{' '}
                remaining
              </div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
              <div className="text-lg font-bold text-purple-600">
                {weeklyProgress.study_time.current}/
                {weeklyProgress.study_time.target}h
              </div>
              <div className="text-xs text-gray-600">Study Time</div>
              <div className="text-xs text-purple-600 font-medium">
                {weeklyProgress.study_time.target -
                  weeklyProgress.study_time.current}
                h left
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <Button
              onClick={onViewProgress}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Full Progress
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Block 2: What To Do Right Now */}
      <Card className="border-2 border-green-100">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-green-600" />
            <span>What To Do Right Now</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Show full-width BlankStateCTA only for new users without courses */}
          {!userDataStatus.hasHistoricalMetrics && !userDataStatus.hasCourses && priorityActions.length === 0 ? (
            <BlankStateCTA />
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Your Priority Now */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1 text-orange-500" />
                Your Priority Now
              </h3>
              <div className="space-y-3">
                {priorityActions.length > 0 ? (
                  priorityActions.map((action) => (
                    <div
                      key={action.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${getUrgencyColor(action.urgency)}`}
                      onClick={() => onActionClick?.(action)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          {action.title}
                        </h4>
                        <Badge
                          className={`text-xs ${getUrgencyBadge(action.urgency)}`}
                        >
                          {action.urgency}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {action.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 flex items-center">
                          <Timer className="h-3 w-3 mr-1" />
                          {action.time_estimate}
                        </span>
                        <Button
                          size="sm"
                          variant={
                            action.urgency === 'urgent' ? 'default' : 'outline'
                          }
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm">All caught up! 🎉</p>
                    <p className="text-xs">No urgent actions at the moment.</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Recommendations - Show for existing users or users with data */}
            {(userDataStatus.hasHistoricalMetrics || userDataStatus.hasActivities) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Brain className="h-4 w-4 mr-1 text-purple-500" />
                AI Recommendations
                {aiLoading && <Loader2 className="h-3 w-3 ml-2 animate-spin" />}
              </h3>
              <div className="space-y-3">
                {aiRecommendations.length > 0 ? (
                  aiRecommendations.map((rec) => {
                    const isCompleted = completedRecommendations.includes(
                      rec.id,
                    );

                    return (
                      <div
                        key={rec.id}
                        className={cn(
                          'p-3 rounded-lg border transition-all',
                          isCompleted
                            ? 'border-green-200 bg-green-50'
                            : 'border-purple-200 bg-purple-50 cursor-pointer hover:shadow-sm',
                        )}
                        onClick={() =>
                          !isCompleted && handleRecommendationClick(rec)
                        }
                      >
                        <div className="flex items-start space-x-3">
                          <div className="text-lg">{rec.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-gray-900 text-sm">
                                {rec.title}
                              </h4>
                              {!isCompleted && (
                                <Badge className="bg-purple-100 text-purple-700 text-xs">
                                  +{rec.xp_reward} XP
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mb-2">
                              {rec.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {rec.estimated_time}
                              </span>
                              {isCompleted ? (
                                <div className="flex items-center space-x-1 text-green-600">
                                  <CheckCircle className="h-3 w-3" />
                                  <span className="text-xs font-medium">
                                    Complete
                                  </span>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-purple-600 border-purple-300"
                                >
                                  {rec.action}
                                </Button>
                              )}
                            </div>
                            {isCompleted && (
                              <div className="mt-2 w-full bg-green-200 rounded-full h-1">
                                <div className="bg-green-500 h-1 rounded-full w-full"></div>
                              </div>
                            )}
                            {rec.confidence && (
                              <div className="mt-1 text-xs text-gray-500">
                                Confidence: {Math.round(rec.confidence * 100)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    <Brain className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                    <p className="text-sm">AI recommendations loading...</p>
                    <p className="text-xs">Check back in a moment.</p>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
