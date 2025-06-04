/**
 * Refactored Schedule Page
 * Clean, modular implementation with separated concerns
 */

'use client';

import React from 'react';
import { SharedDashboardLayout } from '../dashboard/layouts/SharedDashboardLayout';
import { useScheduleState } from './hooks/useScheduleState';
import { ScheduleLoadingState } from './components/ScheduleLoadingState';
import { ScheduleEmptyState } from './components/ScheduleEmptyState';
import { SessionCard } from './components/SessionCard';

export function SchedulePage() {
  const {
    scheduleState,
    viewMode,
    currentUser,
    userCourses,
    isLoading,
    filteredSessions,
    getCourseStyle,
    startSession,
    completeSession,
    selectSession,
  } = useScheduleState();

  const handleCreateSession = () => {
    // TODO: Open create session modal/form
    console.log('Create session clicked');
  };

  const handleBrowseCourses = () => {
    window.location.href = '/my-courses';
  };

  return (
    <SharedDashboardLayout
      currentUser={currentUser}
      pageTitle="Schedule"
      showGamification={false}
    >
      <div className="bg-gray-50 min-h-screen">
        {/* Schedule Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Study Schedule</h1>
              <p className="text-gray-600 mt-1">
                {filteredSessions.length} sessions planned today
              </p>
            </div>

            {/* View Mode Toggle - TODO: Implement */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button className="px-3 py-1 rounded-md text-sm font-medium bg-white text-gray-900 shadow-sm">
                📅 Today
              </button>
              <button className="px-3 py-1 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900">
                📊 Week
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {isLoading ? (
            <ScheduleLoadingState />
          ) : filteredSessions.length === 0 ? (
            <ScheduleEmptyState
              userCoursesCount={userCourses.length}
              onBrowseCourses={handleBrowseCourses}
              onCreateSession={handleCreateSession}
            />
          ) : (
            <div className="space-y-4">
              {/* Active Session Banner */}
              {scheduleState.activeSession && (
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Session in Progress</h3>
                      <p className="text-purple-100 text-sm">
                        {scheduleState.activeSession.title} • {scheduleState.activeSession.course}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">Focus Mode</div>
                      <div className="text-purple-200 text-sm">Stay concentrated!</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sessions List */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSessions.map((session, index) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    courseStyle={getCourseStyle(session.course)}
                    isNext={index === 0 && !scheduleState.completedSessions.has(session.id) && scheduleState.activeSession?.id !== session.id}
                    isActive={scheduleState.activeSession?.id === session.id}
                    isCompleted={scheduleState.completedSessions.has(session.id)}
                    onSelect={selectSession}
                    onStart={startSession}
                    onComplete={completeSession}
                  />
                ))}
              </div>

              {/* Quick Actions */}
              <div className="mt-8 flex gap-4">
                <button
                  onClick={handleCreateSession}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ➕ Add Session
                </button>
                <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  ✨ AI Optimize
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SharedDashboardLayout>
  );
}