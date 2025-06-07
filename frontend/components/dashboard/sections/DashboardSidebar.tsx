'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Trophy, BookOpen, Clock, Target } from 'lucide-react';
import { useGamification } from '@/contexts/GamificationContext';
import { useTodaySchedule } from '@/hooks/useDashboardData';

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
  // Get real gamification data
  const { userStats, isLoading: gamificationLoading } = useGamification();
  
  // Get real schedule data
  const { data: scheduleData, loading: scheduleLoading } = useTodaySchedule();
  
  // Use real data when available, fallback to reasonable defaults
  const stats = {
    rank: userStats?.current_rank || 0,
    rankChange: userStats?.rank_change || 0,
    streak: userStats?.current_streak || 0,
    xpToday: userStats?.daily_progress || 0
  };
  
  // Use real schedule data or show empty state
  const upcomingEvents = scheduleData?.items?.slice(0, 3) || [];

  return (
    <div className="space-y-6">
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
                {gamificationLoading ? (
                  <span className="animate-pulse bg-gray-200 rounded px-2 py-1">--</span>
                ) : (
                  <>
                    <span className="font-semibold">
                      {stats.rank > 0 ? `#${stats.rank}` : 'Unranked'}
                    </span>
                    {stats.rankChange !== 0 && (
                      <span className={`text-xs ${
                        stats.rankChange > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stats.rankChange > 0 ? '↑' : '↓'}{Math.abs(stats.rankChange)}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Study Streak</span>
              <span className="font-semibold">
                {gamificationLoading ? (
                  <span className="animate-pulse bg-gray-200 rounded px-2 py-1">--</span>
                ) : (
                  `${stats.streak} days`
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">XP Today</span>
              <span className="font-semibold">
                {gamificationLoading ? (
                  <span className="animate-pulse bg-gray-200 rounded px-2 py-1">--</span>
                ) : (
                  stats.xpToday
                )}
              </span>
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
          {scheduleLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="w-24 h-3 bg-gray-200 rounded animate-pulse" />
                    <div className="w-16 h-2 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : upcomingEvents.length > 0 ? (
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
                  {(event.status === 'urgent' || event.is_next) && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                      {event.is_next ? 'Next' : 'Soon'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">No events scheduled</p>
              <p className="text-xs text-muted-foreground">Your day is wide open!</p>
            </div>
          )}
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