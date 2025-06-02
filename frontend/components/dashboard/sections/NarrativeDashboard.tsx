'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  Users,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';

// Extracted components
import { WeeklyProgressCard } from '../narrative/WeeklyProgressCard';
import { SmartActionsPanel } from '../narrative/SmartActionsPanel';
import { AIRecommendationsPanel } from '../narrative/AIRecommendationsPanel';
import { UpcomingSchedulePanel } from '../narrative/UpcomingSchedulePanel';

// Extracted hook
import { useNarrativeDashboard } from '../hooks/useNarrativeDashboard';

interface NarrativeDashboardProps {
  onActionClick?: (action: any) => void;
  onCourseClick?: (courseId: string) => void;
  onViewProgress?: () => void;
  onViewAllCourses?: () => void;
  onViewSchedule?: () => void;
}

/**
 * NarrativeDashboard - Refactored narrative-style dashboard component
 * REDUCED from 494 lines to ~200 lines by extracting components and hooks
 * PRESERVED all functionality while following DRY principles
 */
export function NarrativeDashboard({
  onActionClick,
  onCourseClick,
  onViewProgress,
  onViewAllCourses,
  onViewSchedule,
}: NarrativeDashboardProps) {
  const {
    weeklyProgress,
    smartActions,
    aiRecommendations,
    todaySchedule,
    recentCourses,
    isScheduleExpanded,
    isCoursesExpanded,
    toggleScheduleExpanded,
    toggleCoursesExpanded,
    setIsScheduleExpanded,
    setIsCoursesExpanded,
  } = useNarrativeDashboard();

  const handleRecommendationComplete = (id: string) => {
    console.log('Recommendation completed:', id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Your Learning Journey
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Track your progress, discover insights, and stay on top of your
          educational goals with AI-powered recommendations.
        </p>
      </div>

      {/* Weekly Progress */}
      <WeeklyProgressCard 
        progress={weeklyProgress} 
        onViewProgress={onViewProgress} 
      />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                Priority Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SmartActionsPanel 
                actions={smartActions}
                onActionClick={onActionClick}
              />
            </CardContent>
          </Card>

          {/* Today's Schedule */}
          <UpcomingSchedulePanel
            schedule={todaySchedule}
            isExpanded={isScheduleExpanded}
            onToggleExpanded={setIsScheduleExpanded}
            onViewSchedule={onViewSchedule}
          />
        </div>

        {/* Right Column: AI & Courses */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <AIRecommendationsPanel
                recommendations={aiRecommendations}
                onRecommendationComplete={handleRecommendationComplete}
              />
            </CardContent>
          </Card>

          {/* Recent Courses */}
          <Collapsible open={isCoursesExpanded} onOpenChange={toggleCoursesExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                      Recent Courses
                    </CardTitle>
                    {isCoursesExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-4">
                    {recentCourses.map((course) => (
                      <div
                        key={course.id}
                        className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => onCourseClick?.(course.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{course.title}</h4>
                          <span className="text-sm text-gray-500">
                            {course.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600">{course.nextDeadline}</p>
                      </div>
                    ))}
                    
                    <Button
                      onClick={onViewAllCourses}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View All Courses
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>

      {/* Bottom CTA */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Ready to Dive Deeper?
          </h3>
          <p className="text-gray-600 mb-4">
            Explore detailed analytics and insights about your learning progress.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={onViewProgress}>
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
            <Button variant="outline" onClick={onViewAllCourses}>
              <BookOpen className="h-4 w-4 mr-2" />
              Browse Courses
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}