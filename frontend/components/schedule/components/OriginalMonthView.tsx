/**
 * Original Month View - Monthly Calendar
 * Preserves the original monthly calendar design
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { StudySession } from '../types/schedule';

interface OriginalMonthViewProps {
  sessions: StudySession[];
  getCourseStyle: (course: string) => any;
  onSessionSelect: (session: StudySession) => void;
  onViewModeChange?: (mode: 'stack' | 'calendar' | 'month') => void;
}

export function OriginalMonthView({
  sessions,
  getCourseStyle,
  onSessionSelect,
  onViewModeChange,
}: OriginalMonthViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Generate month data
  const today = new Date();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

  const monthDays = [];
  const current = new Date(startDate);
  
  // Generate 6 weeks (42 days) to fill the grid
  for (let i = 0; i < 42; i++) {
    monthDays.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  const monthName = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const getSessionsForDay = (date: Date) => {
    // Filter sessions by date - for now show some sessions on weekdays
    const dayOfWeek = date.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    if (isWeekday && sessions.length > 0) {
      // Show first 1-2 sessions on weekdays
      return sessions.slice(0, Math.min(2, sessions.length));
    }
    return [];
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const renderDay = (date: Date, dayIndex: number) => {
    const daySessions = getSessionsForDay(date);
    const isCurrentDay = isToday(date);
    const isInCurrentMonth = isCurrentMonth(date);
    const dayNumber = date.getDate();

    return (
      <div
        key={dayIndex}
        className={`
          min-h-[120px] border-r border-b border-gray-200 p-2 
          ${isCurrentDay ? 'bg-blue-50 ring-1 ring-blue-300' : 'bg-white'}
          ${!isInCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
          hover:bg-gray-50 transition-colors cursor-pointer
        `}
        onClick={() => {
          // TODO: Handle day selection
          console.log('Day selected:', date.toDateString());
        }}
      >
        {/* Day Number */}
        <div className={`
          text-sm font-medium mb-1
          ${isCurrentDay ? 'text-blue-700' : isInCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
        `}>
          {dayNumber}
        </div>

        {/* Sessions */}
        <div className="space-y-1">
          {daySessions.slice(0, 3).map((session, sessionIndex) => {
            const courseStyle = getCourseStyle(session.course);
            
            return (
              <div
                key={session.id}
                className="text-xs p-1 rounded truncate cursor-pointer hover:shadow-sm transition-shadow"
                style={{
                  backgroundColor: courseStyle?.color + '20',
                  borderLeft: `2px solid ${courseStyle?.color}`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSessionSelect(session);
                }}
              >
                <div className="font-medium text-gray-900 truncate">
                  {session.title}
                </div>
                <div className="text-gray-600 truncate">
                  {session.course}
                </div>
              </div>
            );
          })}

          {/* Show more indicator */}
          {daySessions.length > 3 && (
            <div className="text-xs text-gray-500 text-center py-1">
              +{daySessions.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Main Calendar - Left 75% */}
      <div className="flex-1 p-6">
        {/* Month Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {monthName}
              </h2>
              <div className="text-sm text-gray-600">
                Monthly overview • Click days to see details
              </div>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                disabled={currentDate.getMonth() === today.getMonth() && 
                         currentDate.getFullYear() === today.getFullYear()}
              >
                Today
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="p-3 text-center bg-gray-50 border-r border-gray-200 last:border-r-0"
            >
              <div className="text-xs font-medium text-gray-500">
                {day}
              </div>
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div className="grid grid-cols-7">
          {monthDays.map((date, index) => renderDay(date, index))}
        </div>
      </div>

        {/* Month Footer */}
        <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
          <div>
            Showing {monthName}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-200 rounded"></div>
              <span>Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-200 rounded"></div>
              <span>Has Sessions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Month Overview */}
      <div className="w-80 bg-gray-50 border-l border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Month Overview</h3>
        
        {/* Total Sessions Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="text-sm text-blue-600 font-medium mb-1">Total Sessions</div>
          <div className="text-3xl font-bold text-blue-700">12</div>
          <div className="text-xs text-blue-600">Across {monthName.split(' ')[0]}</div>
        </div>

        {/* Month XP Target Card */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="text-sm text-green-600 font-medium mb-1">Month XP Target</div>
          <div className="text-3xl font-bold text-green-700">+450</div>
          <div className="text-xs text-green-600">
            {sessions.reduce((sum, s) => sum + (s.xpReward || 0), 0)} / 450 earned
          </div>
        </div>

        {/* Upcoming Deadlines Card */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-orange-600 font-medium mb-3">Upcoming Deadlines</div>
          <div className="space-y-2">
            {sessions.filter(session => session.dueIn).slice(0, 3).map(session => (
              <div key={session.id}>
                <div className="font-medium text-orange-800">{session.title}</div>
                <div className="text-xs text-orange-600">Due {session.dueIn}</div>
              </div>
            ))}
            {sessions.filter(session => session.dueIn).length === 0 && (
              <div className="text-sm text-orange-600">No upcoming deadlines</div>
            )}
          </div>
        </div>

        {/* View Switch Buttons */}
        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-center"
            onClick={() => onViewModeChange?.('calendar')}
          >
            Switch to Week View
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-center"
            onClick={() => onViewModeChange?.('stack')}
          >
            Switch to Focus Stack
          </Button>
        </div>
      </div>
    </div>
  );
}