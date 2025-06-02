/**
 * Original Calendar View - Weekly Calendar with Drag & Drop
 * Preserves the original weekly calendar design
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { StudySession } from '../types/schedule';
import { GhostWeekTemplate } from './GhostWeekTemplate';

interface OriginalCalendarViewProps {
  sessions: StudySession[];
  getCourseStyle: (course: string) => any;
  onSessionSelect: (session: StudySession) => void;
  onSessionStart: (session: StudySession) => void;
  onSessionComplete: (session: StudySession) => void;
  onViewModeChange?: (mode: 'stack' | 'calendar' | 'month') => void;
}

export function OriginalCalendarView({
  sessions,
  getCourseStyle,
  onSessionSelect,
  onSessionStart,
  onSessionComplete,
  onViewModeChange,
}: OriginalCalendarViewProps) {
  const [currentWeek, setCurrentWeek] = useState(0); // 0 = this week, 1 = next week, etc.

  // Generate week data
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + (currentWeek * 7));
  
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });

  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const formatDateHeader = (date: Date) => {
    const isToday = date.toDateString() === today.toDateString();
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = date.getDate();
    
    return { dayName, dayNumber, isToday };
  };

  const getSessionsForDay = (date: Date) => {
    // Filter sessions by the specific date
    return sessions.filter(session => {
      if (!session.scheduledDate && !session.estimatedStart) return false;
      
      let sessionDate: Date;
      
      if (session.scheduledDate) {
        // Use scheduledDate if available (from local sessions)
        sessionDate = new Date(session.scheduledDate);
      } else if (session.estimatedStart) {
        // Parse estimatedStart time (e.g., "2:00 PM") and create date for today
        const [time, period] = session.estimatedStart.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        const adjustedHours = period === 'PM' && hours !== 12 ? hours + 12 : (period === 'AM' && hours === 12 ? 0 : hours);
        
        sessionDate = new Date(date);
        sessionDate.setHours(adjustedHours, minutes || 0, 0, 0);
      } else {
        return false;
      }
      
      // Check if session is on the same day
      return sessionDate.toDateString() === date.toDateString();
    });
  };

  const renderTimeSlot = (timeStr: string, dayIndex: number) => {
    const dayDate = weekDays[dayIndex];
    const daySessions = getSessionsForDay(dayDate);
    
    return (
      <div
        key={`${timeStr}-${dayIndex}`}
        className="relative border-b border-gray-100 h-12 group hover:bg-gray-50"
      >
        {/* Time slot sessions would go here */}
        {daySessions.map((session, sessionIndex) => {
          const courseStyle = getCourseStyle(session.course);
          
          // Check if this session should be shown in this time slot
          let sessionHour = '';
          if (session.scheduledDate) {
            const sessionDate = new Date(session.scheduledDate);
            sessionHour = sessionDate.getHours().toString().padStart(2, '0') + ':00';
          } else if (session.estimatedStart) {
            const [time, period] = session.estimatedStart.split(' ');
            const [hours] = time.split(':').map(Number);
            const adjustedHours = period === 'PM' && hours !== 12 ? hours + 12 : (period === 'AM' && hours === 12 ? 0 : hours);
            sessionHour = adjustedHours.toString().padStart(2, '0') + ':00';
          }
          
          // Show session in the correct time slot
          if (timeStr === sessionHour) {
            return (
              <div
                key={session.id}
                className="absolute inset-x-1 top-1 bottom-1 rounded p-1 text-xs cursor-pointer hover:shadow-sm transition-shadow"
                style={{
                  backgroundColor: courseStyle?.color + '20',
                  borderLeft: `3px solid ${courseStyle?.color}`,
                }}
                onClick={() => onSessionSelect(session)}
              >
                <div className="font-medium text-gray-900 truncate">
                  {session.title}
                </div>
                <div className="text-gray-600 truncate">
                  {session.course}
                </div>
              </div>
            );
          }
          return null;
        })}

        {/* Add session button on hover */}
        <button
          className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          onClick={() => {
            // TODO: Open create session dialog for this time slot
            console.log('Add session at', timeStr, 'on', dayDate.toDateString());
          }}
        >
          <Plus className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Main Calendar - Left 75% */}
      <div className="flex-1 p-6">
        {/* Week Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {currentWeek === 0 ? 'This Week' : 
                 currentWeek === 1 ? 'Next Week' : 
                 `${Math.abs(currentWeek)} weeks ${currentWeek > 0 ? 'ahead' : 'ago'}`}
              </h2>
              <div className="text-sm text-gray-600">
                Drag & drop to reschedule • Auto-saves changes
              </div>
            </div>

            {/* Week Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(currentWeek - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {currentWeek !== 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeek(0)}
                >
                  Today
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(currentWeek + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

      {/* Calendar Grid */}
      <div className="relative bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Show ghost template when no sessions */}
        {sessions.length === 0 && <GhostWeekTemplate />}
        
        {/* Day Headers */}
        <div className="grid grid-cols-8 border-b border-gray-200">
          {/* Time column header */}
          <div className="p-3 bg-gray-50 border-r border-gray-200">
            <div className="text-xs font-medium text-gray-500">Time</div>
          </div>
          
          {/* Day headers */}
          {weekDays.map((date, index) => {
            const { dayName, dayNumber, isToday } = formatDateHeader(date);
            
            return (
              <div
                key={index}
                className={`p-3 text-center border-r border-gray-200 last:border-r-0 ${
                  isToday ? 'bg-blue-50' : 'bg-gray-50'
                }`}
              >
                <div className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                  {dayName}
                </div>
                <div className={`text-lg font-semibold ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>
                  {dayNumber}
                </div>
              </div>
            );
          })}
        </div>

        {/* Calendar Body */}
        <div className="max-h-[600px] overflow-y-auto">
          {timeSlots.map((timeStr) => (
            <div key={timeStr} className="grid grid-cols-8">
              {/* Time label */}
              <div className="p-3 text-xs text-gray-500 border-r border-gray-200 bg-gray-50">
                {timeStr}
              </div>
              
              {/* Day columns */}
              {weekDays.map((_, dayIndex) => renderTimeSlot(timeStr, dayIndex))}
            </div>
          ))}
        </div>
      </div>

        {/* Calendar Footer */}
        <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
          <div>
            Showing {startOfWeek.toLocaleDateString()} - {weekDays[6].toLocaleDateString()}
          </div>
          <div>
            Click any time slot to add a session
          </div>
        </div>

        {/* XP Microcopy - Only show when no sessions */}
        {sessions.length === 0 && (
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-400 font-medium">
              You've earned 0 XP this week. Each 25-min block = +10 XP 
            </p>
          </div>
        )}
      </div>

      {/* Right Sidebar - Week Overview */}
      <div className="w-80 bg-gray-50 border-l border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Week Overview</h3>
        
        {/* Weekly Sessions Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="text-sm text-blue-600 font-medium mb-1">Weekly Sessions</div>
          <div className="text-3xl font-bold text-blue-700">{sessions.length}</div>
          <div className="text-xs text-blue-600">This week</div>
        </div>

        {/* Weekly XP Card */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <div className="text-sm text-purple-600 font-medium mb-1">Weekly XP</div>
          <div className="text-3xl font-bold text-purple-700">
            +{sessions.reduce((sum, s) => sum + (s.xpReward || 0), 0)}
          </div>
          <div className="text-xs text-purple-600">XP available</div>
        </div>

        {/* Study Time Card */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-green-600 font-medium mb-1">Study Time</div>
          <div className="text-3xl font-bold text-green-700">
            {Math.ceil(sessions.reduce((total, session) => {
              const duration = parseInt(session.duration.replace(/[^\d]/g, '')) || 45;
              return total + duration;
            }, 0) / 60)}h
          </div>
          <div className="text-xs text-green-600">Planned this week</div>
        </div>

        {/* Today's Schedule */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="text-sm font-medium text-gray-900 mb-3">Today's Schedule</div>
          <div className="space-y-2">
            {sessions.slice(0, 3).map((session, index) => (
              <div key={session.id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <div className="text-xs text-gray-600">
                  {session.estimatedStart} - {session.title}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* View Switch Buttons */}
        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-center"
            onClick={() => onViewModeChange?.('month')}
          >
            Switch to Month View
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