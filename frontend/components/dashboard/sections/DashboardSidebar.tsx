'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Trophy, BookOpen, Clock, Target } from 'lucide-react';
import { StudySessionTracker } from '@/components/study';

interface DashboardSidebarProps {
  onViewSchedule: () => void;
  onMaintainRank: () => void;
  onViewAllCourses: () => void;
}

export function DashboardSidebar({
  onViewSchedule,
  onMaintainRank,
  onViewAllCourses
}: DashboardSidebarProps) {
  // Sample data for sidebar
  const upcomingEvents = [
    { time: '10:00 AM', title: 'CS101 Lecture', status: 'upcoming' },
    { time: '2:00 PM', title: 'Math Quiz', status: 'urgent' },
    { time: '4:00 PM', title: 'Study Group', status: 'normal' }
  ];

  const stats = {
    rank: 15,
    rankChange: 3,
    streak: 7,
    xpToday: 150
  };

  return (
    <div className="space-y-6">
      {/* Study Session Tracker */}
      <StudySessionTracker />

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Current Rank</span>
              <div className="flex items-center gap-1">
                <span className="font-semibold">#{stats.rank}</span>
                <span className="text-xs text-green-600">↑{stats.rankChange}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Study Streak</span>
              <span className="font-semibold">{stats.streak} days</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">XP Today</span>
              <span className="font-semibold">{stats.xpToday}</span>
            </div>
            <Button 
              className="w-full mt-2" 
              variant="outline"
              onClick={onMaintainRank}
            >
              <Target className="mr-2 h-4 w-4" />
              Maintain Your Rank
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Schedule */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onViewSchedule}
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingEvents.map((event, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.time}</p>
                </div>
                {event.status === 'urgent' && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                    Soon
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            className="w-full justify-start" 
            variant="ghost"
            onClick={onViewAllCourses}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            View All Courses
          </Button>
          <Button 
            className="w-full justify-start" 
            variant="ghost"
            onClick={onViewSchedule}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Manage Schedule
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}