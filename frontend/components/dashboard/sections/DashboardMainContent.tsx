'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Target, Trophy } from 'lucide-react';

interface DashboardMainContentProps {
  onActionClick: (action: any) => void;
  onCourseClick: (courseId: string) => void;
  onViewProgress: () => void;
}

export function DashboardMainContent({
  onActionClick,
  onCourseClick,
  onViewProgress
}: DashboardMainContentProps) {
  // Sample data for the main content area
  const priorityActions = [
    {
      id: 'continue-learning',
      title: 'Continue Learning',
      description: 'Resume your last course',
      icon: BookOpen,
      course: 'cs101'
    },
    {
      id: 'complete-assignment',
      title: 'Complete Assignment',
      description: 'Due in 2 days',
      icon: Target,
      course: 'math201'
    },
    {
      id: 'review-material',
      title: 'Review Material',
      description: 'Prepare for upcoming quiz',
      icon: Trophy,
      course: 'physics301'
    }
  ];

  const recentCourses = [
    { id: 'cs101', name: 'Computer Science 101', progress: 75 },
    { id: 'math201', name: 'Mathematics 201', progress: 60 },
    { id: 'physics301', name: 'Physics 301', progress: 45 }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome Back!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Ready to continue your learning journey? Here are your priority actions for today.
          </p>
        </CardContent>
      </Card>

      {/* Priority Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Priority Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {priorityActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card 
                key={action.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => onActionClick(action)}
              >
                <CardContent className="p-6">
                  <Icon className="h-8 w-8 mb-3 text-primary" />
                  <h3 className="font-semibold mb-1">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Courses */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Courses</h2>
          <Button variant="ghost" size="sm" onClick={onViewProgress}>
            View All Progress <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {recentCourses.map((course) => (
            <Card 
              key={course.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onCourseClick(course.id)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{course.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {course.progress}% complete
                    </p>
                  </div>
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}