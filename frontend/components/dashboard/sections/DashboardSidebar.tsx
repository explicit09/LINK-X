'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useTodaySchedule,
  usePerformancePulse,
  useCoursesOverview,
} from '@/hooks/useDashboardData';
import {
  Calendar,
  Clock,
  ChevronRight,
  TrendingUp,
  Target,
  BookOpen,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface DashboardSidebarProps {
  onViewSchedule?: () => void;
  onMaintainRank?: () => void;
  onViewAllCourses?: () => void;
}

export function DashboardSidebar({
  onViewSchedule,
  onMaintainRank,
  onViewAllCourses,
}: DashboardSidebarProps) {
  // Real data from API
  const { data: scheduleData, loading: scheduleLoading } = useTodaySchedule();
  const { data: performanceData, loading: performanceLoading } =
    usePerformancePulse();
  const { data: coursesData, loading: coursesLoading } = useCoursesOverview();

  // Extract data with fallbacks
  const todaySchedule = scheduleData?.items || [];
  const performanceMetrics = performanceData?.metrics || {
    improvement_percentage: 0,
    current_rank: 0,
    rank_change: 0,
    average_score: 0,
  };
  const coursesOverview = coursesData || {
    active_courses: 0,
    behind_courses: 0,
    total_courses: 0,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const formatImprovementDisplay = (improvement: number) => {
    if (improvement > 0) {
      return `+${improvement}%`;
    } else if (improvement < 0) {
      return `${improvement}%`;
    }
    return '0%';
  };

  const getImprovementColor = (improvement: number) => {
    if (improvement > 0) return 'text-green-600';
    if (improvement < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-4">
      {/* Today's Schedule - Compressed for Sidebar */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-base">
              <Calendar className="h-4 w-4 text-gray-600" />
              <span>Today's Schedule</span>
            </CardTitle>
            {scheduleLoading ? (
              <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
            ) : (
              <Badge variant="secondary" className="text-xs">
                {todaySchedule.filter((e) => e.status !== 'completed').length}{' '}
                left
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {scheduleLoading ? (
            <div className="p-4 text-center text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading schedule...</p>
            </div>
          ) : todaySchedule.length > 0 ? (
            todaySchedule.map((event, index) => (
              <div
                key={index}
                className={`p-2 rounded text-xs border transition-all ${
                  event.is_next
                    ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-700 w-12">
                      {event.time}
                    </span>
                    <span
                      className={`text-gray-900 ${event.is_next ? 'font-medium' : ''}`}
                    >
                      {event.title}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getStatusColor(event.status)}`}
                  >
                    {event.status === 'urgent'
                      ? 'Due'
                      : event.status === 'completed'
                        ? '✓'
                        : 'Soon'}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-gray-400" />
              <p className="text-xs">No scheduled items</p>
              <p className="text-xs">Enjoy your free time! 🌟</p>
            </div>
          )}

          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewSchedule}
              className="w-full justify-between text-gray-600 hover:text-gray-900"
            >
              <span className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                View Full Schedule
              </span>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Pulse */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-base">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span>Performance Pulse</span>
            {performanceLoading && (
              <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {performanceLoading ? (
            <div className="p-4 text-center text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              <p className="text-xs">Calculating performance...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-center">
                <div
                  className={`text-2xl font-bold ${getImprovementColor(performanceMetrics.improvement_percentage)}`}
                >
                  {formatImprovementDisplay(
                    performanceMetrics.improvement_percentage,
                  )}
                </div>
                <div className="text-xs text-gray-500">This Week</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2 bg-amber-50 rounded border border-amber-200">
                  <div className="text-sm font-semibold text-amber-700">
                    {performanceMetrics.current_rank > 0
                      ? `Rank #${performanceMetrics.current_rank}`
                      : 'Unranked'}
                  </div>
                  <div className="text-xs text-amber-600">
                    {performanceMetrics.rank_change > 0
                      ? `+${performanceMetrics.rank_change} this week`
                      : performanceMetrics.rank_change < 0
                        ? `${performanceMetrics.rank_change} this week`
                        : 'No change'}
                  </div>
                </div>
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="text-sm font-semibold text-blue-700">
                    {performanceMetrics.average_score}% Avg
                  </div>
                  <div className="text-xs text-blue-600">
                    {performanceMetrics.improvement_percentage >= 0
                      ? `+${Math.abs(performanceMetrics.improvement_percentage)}% up`
                      : `${performanceMetrics.improvement_percentage}% down`}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMaintainRank}
                  className="w-full"
                >
                  <Target className="h-3 w-3 mr-1" />
                  Action Plan
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Courses Card */}
      <Card className="border border-gray-200 lg:order-3 order-last">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-sm font-semibold">
            <span>📚</span>
            <span>Courses</span>
            {coursesLoading && (
              <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coursesLoading ? (
            <div className="p-4 text-center text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading courses...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Status badges with dot treatment */}
              <div className="flex items-center gap-2 text-xs">
                <div className="p-1.5 bg-green-50 rounded border border-green-200">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="font-medium text-green-700">
                      {coursesOverview.active_courses} Active
                    </span>
                  </div>
                </div>
                {/* Conditionally show Behind badge only when count > 0 */}
                {coursesOverview.behind_courses > 0 && (
                  <div className="p-1.5 bg-red-50 rounded border border-red-200">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      <span className="font-medium text-red-700">
                        {coursesOverview.behind_courses} Behind
                      </span>
                    </div>
                  </div>
                )}
                {/* Show celebration when all on track */}
                {coursesOverview.behind_courses === 0 &&
                  coursesOverview.active_courses > 0 && (
                    <div className="text-xs text-green-600 font-medium">
                      All on track 🎉
                    </div>
                  )}
                {/* Show message when no courses */}
                {coursesOverview.total_courses === 0 && (
                  <div className="text-xs text-gray-500">No courses yet</div>
                )}
              </div>

              {/* Full-width CTA Button */}
              <div className="pt-2">
                <Button
                  variant="ghost"
                  onClick={onViewAllCourses}
                  className="w-full h-9 justify-between text-gray-600 hover:text-gray-900 hover:bg-primary/5 border border-primary/20 hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span>View All Courses</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
