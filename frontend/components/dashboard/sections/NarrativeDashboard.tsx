'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  Target,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp,
  Brain,
  Calendar,
  BookOpen,
  Users,
  BarChart3,
  Play,
  Timer,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

interface NarrativeDashboardProps {
  onActionClick?: (action: any) => void;
  onCourseClick?: (courseId: string) => void;
  onViewProgress?: () => void;
  onViewAllCourses?: () => void;
  onViewSchedule?: () => void;
}

export function NarrativeDashboard({
  onActionClick,
  onCourseClick,
  onViewProgress,
  onViewAllCourses,
  onViewSchedule,
}: NarrativeDashboardProps) {
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const [isCoursesExpanded, setIsCoursesExpanded] = useState(false);

  // Mock data
  const weeklyProgress = {
    overall: 62,
    xp: { current: 78, total: 150 },
    tasks: { current: 5, total: 8 },
    study: { current: 8.5, total: 12 },
  };

  const priorityActions = [
    {
      id: 'cs229-urgent',
      title: 'CS229 Assignment',
      description: 'Neural Networks Project - Due today',
      urgency: 'urgent',
      timeEstimate: '45 min',
      type: 'assignment',
      course: 'CS229',
    },
    {
      id: 'cs224n-weak',
      title: 'CS224n Review',
      description: 'Weak score on last quiz',
      urgency: 'medium',
      timeEstimate: '20 min',
      type: 'review',
      course: 'CS224n',
    },
    {
      id: 'cs231n-streak',
      title: 'CS231n Practice',
      description: 'Maintain 5-day streak',
      urgency: 'low',
      timeEstimate: '15 min',
      type: 'practice',
      course: 'CS231n',
    },
  ];

  const [completedRecommendations, setCompletedRecommendations] = useState<
    string[]
  >([]);

  const aiRecommendations = [
    {
      id: 'focus-session',
      title: 'Start 45-min Focus Session',
      description: 'Based on your energy patterns',
      icon: '🧠',
      action: 'Start Now',
      xpReward: 25,
      estimatedTime: '45 min',
    },
    {
      id: 'quick-tutorial',
      title: '10-min Neural Networks Recap',
      description: "Prep for today's assignment",
      icon: '⚡',
      action: 'Watch Now',
      xpReward: 10,
      estimatedTime: '10 min',
    },
    {
      id: 'streak-boost',
      title: '15-min Streak Booster',
      description: 'Keep momentum going',
      icon: '🔥',
      action: 'Continue',
      xpReward: 15,
      estimatedTime: '15 min',
    },
  ];

  const handleRecommendationClick = (rec: any) => {
    // Mark as completed and show feedback
    setCompletedRecommendations((prev) => [...prev, rec.id]);
    onActionClick?.(rec);

    // Show XP reward feedback
    setTimeout(() => {
      // This would trigger XP animation in header
    }, 500);
  };

  const todaySchedule = [
    { time: '9:00 AM', title: 'CS229 Assignment', status: 'urgent' },
    { time: '11:00 AM', title: 'Study Group', status: 'scheduled' },
    { time: '2:00 PM', title: 'CS224n Review', status: 'scheduled' },
    { time: '4:00 PM', title: 'Computer Vision Lab', status: 'completed' },
  ];

  const courses = [
    { id: 'cs229', title: 'Machine Learning', code: 'CS229', progress: 85 },
    { id: 'cs224n', title: 'NLP', code: 'CS224n', progress: 67 },
    { id: 'cs231n', title: 'Computer Vision', code: 'CS231n', progress: 92 },
  ];

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

  // Split return into main content and sidebar content
  const renderMainContent = () => (
    <div className="space-y-6">
      {/* Block 1: This Week's Mission (Unified Container) */}
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
          {/* Progress Summary Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
              <div className="text-lg font-bold text-yellow-600">
                {weeklyProgress.xp.current}/{weeklyProgress.xp.total}
              </div>
              <div className="text-xs text-gray-600">XP Progress</div>
              <div className="text-xs text-yellow-600 font-medium">
                +{weeklyProgress.xp.total - weeklyProgress.xp.current} to go
              </div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
              <div className="text-lg font-bold text-blue-600">
                {weeklyProgress.tasks.current}/{weeklyProgress.tasks.total}
              </div>
              <div className="text-xs text-gray-600">Tasks Done</div>
              <div className="text-xs text-blue-600 font-medium">
                {weeklyProgress.tasks.total - weeklyProgress.tasks.current}{' '}
                remaining
              </div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
              <div className="text-lg font-bold text-purple-600">
                {weeklyProgress.study.current}/{weeklyProgress.study.total}h
              </div>
              <div className="text-xs text-gray-600">Study Time</div>
              <div className="text-xs text-purple-600 font-medium">
                {weeklyProgress.study.total - weeklyProgress.study.current}h
                left
              </div>
            </div>
          </div>

          {/* Action Button */}
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

      {/* Block 2: What To Do Right Now (Split Panel) */}
      <Card className="border-2 border-green-100">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-green-600" />
            <span>What To Do Right Now</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Your Priority Now */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1 text-orange-500" />
                Your Priority Now
              </h3>
              <div className="space-y-3">
                {priorityActions.map((action) => (
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
                        {action.timeEstimate}
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
                ))}
              </div>
            </div>

            {/* Right: AI Recommendations */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Brain className="h-4 w-4 mr-1 text-purple-500" />
                AI Recommendations
              </h3>
              <div className="space-y-3">
                {aiRecommendations.map((rec) => {
                  const isCompleted = completedRecommendations.includes(rec.id);

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
                                +{rec.xpReward} XP
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            {rec.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {rec.estimatedTime}
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
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Block 3: Today's Schedule (Collapsible) */}
      <Collapsible
        open={isScheduleExpanded}
        onOpenChange={setIsScheduleExpanded}
      >
        <Card className="border border-gray-200">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex flex-col items-start">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-gray-600" />
                    <span className="font-semibold">Today's Schedule</span>
                    <Badge variant="secondary">
                      {todaySchedule.length} events
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Next: CS229 @ 9am •{' '}
                    {
                      todaySchedule.filter((e) => e.status !== 'completed')
                        .length
                    }{' '}
                    remaining
                  </div>
                </div>
                {isScheduleExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {todaySchedule.map((event, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-600 w-16">
                        {event.time}
                      </span>
                      <span className="text-sm text-gray-900">
                        {event.title}
                      </span>
                    </div>
                    <Badge
                      variant={
                        event.status === 'urgent'
                          ? 'destructive'
                          : event.status === 'completed'
                            ? 'default'
                            : 'secondary'
                      }
                      className="text-xs"
                    >
                      {event.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Block 4: All Courses (Minimized/Collapsible) */}
      <Collapsible open={isCoursesExpanded} onOpenChange={setIsCoursesExpanded}>
        <Card className="border border-gray-200">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex flex-col items-start">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5 text-gray-600" />
                    <span className="font-semibold">All Courses</span>
                    <Badge variant="secondary">{courses.length} active</Badge>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Avg:{' '}
                    {Math.round(
                      courses.reduce((acc, c) => acc + c.progress, 0) /
                        courses.length,
                    )}
                    % complete • 1 behind schedule
                  </div>
                </div>
                {isCoursesExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:shadow-sm transition-all"
                    onClick={() => onCourseClick?.(course.id)}
                  >
                    <h4 className="font-medium text-gray-900 text-sm">
                      {course.code}
                    </h4>
                    <p className="text-xs text-gray-600 mb-2">{course.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {course.progress}% complete
                      </span>
                      <div className="w-16 bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-blue-500 h-1 rounded-full"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
