/**
 * Original Schedule Page UI - Restored and Refactored
 * Preserves the original UI design with modular architecture underneath
 */

'use client';

import React, { useState, useEffect } from 'react';
import { SharedDashboardLayout } from '../dashboard/layouts/SharedDashboardLayout';
import { useScheduleState } from './hooks/useScheduleState';
import { scheduleAPI } from '@/lib/api/endpoints/schedule';
import { ScheduleLoadingState } from './components/ScheduleLoadingState';
import { ScheduleEmptyState } from './components/ScheduleEmptyState';
import { ScheduleOnboardingModal } from './components/ScheduleOnboardingModal';
import { OriginalSessionCard } from './components/OriginalSessionCard';
import { OriginalCalendarView } from './components/OriginalCalendarView';
import { OriginalMonthView } from './components/OriginalMonthView';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  TrendingUp, 
  Sparkles, 
  Wand2 
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

type ViewMode = 'stack' | 'calendar' | 'month';

export function OriginalSchedulePage() {
  const {
    scheduleState,
    currentUser,
    userCourses,
    isLoading,
    filteredSessions,
    getCourseStyle,
    startSession,
    completeSession,
    selectSession,
    createLocalSession,
  } = useScheduleState();

  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [showAutofillDialog, setShowAutofillDialog] = useState(false);
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // DnD Setup
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      // TODO: Implement session reordering logic
      console.log('Reorder sessions:', { from: active.id, to: over.id });
    }
  };

  const handleAIOptimize = async () => {
    setAutofillLoading(true);
    try {
      // Call the real AI optimization endpoint
      const optimizationResult = await scheduleAPI.optimizeSchedule({
        days_ahead: 7,
        params: {
          prioritize_deadlines: true,
          balance_cognitive_load: true,
          respect_preferences: true,
          max_daily_hours: 8,
        }
      });
      
      console.log('AI Optimization Result:', optimizationResult);
      
      // TODO: Apply optimized sessions to the schedule
      // For now, just show success message
      if (optimizationResult?.data) {
        console.log('Schedule optimized successfully!');
      }
    } catch (error) {
      console.error('Failed to optimize schedule:', error);
    } finally {
      setAutofillLoading(false);
    }
  };

  // Auto-launch onboarding modal on first visit
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeenOnboarding = localStorage.getItem('schedule-onboarding-completed');
      
      // Show modal if: no sessions AND not loading AND user has courses AND hasn't seen onboarding
      if (!hasSeenOnboarding && !isLoading && filteredSessions.length === 0 && userCourses.length > 0) {
        const timer = setTimeout(() => {
          setShowOnboardingModal(true);
        }, 1000); // Delay 1 second to let page load
        
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, filteredSessions.length, userCourses.length]);

  const handleCreateSession = () => {
    // Always show the onboarding modal for guided session creation
    setShowOnboardingModal(true);
  };

  // Debug function to reset onboarding for testing
  const resetOnboarding = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('schedule-onboarding-completed');
      console.log('Onboarding reset - modal will show on next empty state');
    }
  };

  const handleBrowseCourses = () => {
    window.location.href = '/my-courses';
  };

  const handleOnboardingComplete = async (sessionData: {
    course: string;
    duration: string;
    timeSlot: string;
    title?: string;
  }) => {
    try {
      // Parse duration to minutes
      const parseDurationToMinutes = (duration: string): number => {
        if (duration.includes('h') && duration.includes('m')) {
          const hours = parseFloat(duration.split('h')[0]);
          const minutes = parseInt(duration.split('h')[1].replace('m', '').trim());
          return hours * 60 + minutes;
        } else if (duration.includes('h')) {
          return parseFloat(duration.replace('h', '')) * 60;
        } else if (duration.includes('m')) {
          return parseInt(duration.replace('m', ''));
        }
        return 60; // Default 1 hour
      };

      // Create today's date with selected time
      const today = new Date();
      const [time, period] = sessionData.timeSlot.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      const adjustedHours = period === 'PM' && hours !== 12 ? hours + 12 : (period === 'AM' && hours === 12 ? 0 : hours);
      
      const scheduledStart = new Date(today);
      scheduledStart.setHours(adjustedHours, minutes || 0, 0, 0);
      
      const durationMinutes = parseDurationToMinutes(sessionData.duration);
      const scheduledEnd = new Date(scheduledStart);
      scheduledEnd.setMinutes(scheduledEnd.getMinutes() + durationMinutes);

      // Find the course name for display
      const selectedCourseObj = userCourses.find(course => course.id === sessionData.course);
      const courseName = selectedCourseObj?.title || selectedCourseObj?.name || 'Unknown Course';

      // Create the session via API
      const createSessionRequest = {
        title: sessionData.title || `Study ${courseName}`,
        description: `Focus session for ${courseName}`,
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        duration_minutes: durationMinutes,
        course_id: sessionData.course, // This is now the course ID (UUID)
        session_type: 'study',
        cognitive_load: 'medium' as const,
        urgency: 'soon' as const,
        priority_score: 5,
        xp_reward: Math.floor(durationMinutes / 25) * 10, // 10 XP per 25 min block
        is_ai_suggested: false
      };
      
      console.log('Creating session from onboarding:', createSessionRequest);
      
      // Try API first, fallback to local session
      try {
        const response = await scheduleAPI.createSession(createSessionRequest);
        console.log('✅ Session created successfully via API:', response);
        
        // Refresh to get updated sessions from backend
        window.location.reload();
      } catch (apiError) {
        console.warn('⚠️ API failed, creating local session instead:', apiError);
        
        // Create local session for immediate UI feedback
        const localSession = createLocalSession(sessionData);
        console.log('✅ Local session created:', localSession);
        
        // Show success message (session will appear immediately)
        console.log('Session created locally and will appear in your calendar!');
      }
      
      // Mark onboarding as completed
      if (typeof window !== 'undefined') {
        localStorage.setItem('schedule-onboarding-completed', 'true');
      }
      
      // Close modal  
      setShowOnboardingModal(false);
      
    } catch (error) {
      console.error('❌ Complete failure in session creation:', error);
      
      // Still mark onboarding as completed to prevent loop
      if (typeof window !== 'undefined') {
        localStorage.setItem('schedule-onboarding-completed', 'true');
      }
      setShowOnboardingModal(false);
      
      // Show user-friendly error
      alert('Session creation failed, but you can try creating one manually using the "Add Session" button.');
    }
  };

  const trackEvent = (event: string, data: any) => {
    console.log('Event tracked:', event, data);
  };

  // Stack View Rendering
  const renderStackView = () => (
    <div className="flex h-[calc(100vh-48px)]">
      {/* Focus Stack - Left 60% */}
      <div className="flex-1 max-w-[60%] p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Today's Focus Stack
              </h2>
              <div className="text-sm text-gray-600 mt-1">
                Tackle from top to bottom for optimal energy usage
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500 text-right">
                AI-prioritized by cognitive load &<br />deadlines
              </div>
              <Button
                onClick={handleAIOptimize}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2"
                disabled={autofillLoading}
              >
                {autofillLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                AI Preview
              </Button>
            </div>
          </div>
        </div>

        {/* Session Stack - DnD Enabled */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredSessions.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 overflow-y-auto scroll-smooth">
              {filteredSessions.map((session, index) => {
                const courseStyle = getCourseStyle(session.course);
                const isNext = index === 0;

                return (
                  <OriginalSessionCard
                    key={session.id}
                    session={session}
                    index={index}
                    courseStyle={courseStyle}
                    isNext={isNext}
                    isActive={scheduleState.activeSession?.id === session.id}
                    isCompleted={scheduleState.completedSessions.has(session.id)}
                    onSelect={selectSession}
                    onStart={startSession}
                    onComplete={completeSession}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Right Sidebar - 40% */}
      <div className="w-[40%] bg-gray-50 border-l border-gray-200 p-6">
        {/* Active Session Status */}
        {scheduleState.activeSession && (
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg mb-6">
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

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                onClick={handleCreateSession}
                className="w-full justify-start bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Session
              </Button>
              <Button
                onClick={handleAIOptimize}
                className="w-full justify-start bg-purple-600 hover:bg-purple-700"
                disabled={autofillLoading}
              >
                {autofillLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent mr-2" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                AI Optimize
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Insights
              </Button>
            </div>
          </div>

          {/* Study Stats */}
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Today's Progress</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Sessions Planned</span>
                <span className="font-medium">{filteredSessions.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">XP Available</span>
                <span className="font-medium text-blue-600">
                  {filteredSessions.reduce((sum, s) => sum + (s.xpReward || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Study Streak</span>
                <span className="font-medium text-purple-600">
                  {scheduleState.completedSessions.size > 0 ? `${scheduleState.completedSessions.size} sessions` : 'Start your streak!'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <SharedDashboardLayout
      currentUser={currentUser}
      pageTitle="Schedule"
      showGamification={false}
    >
      <div className="bg-gray-50 min-h-screen">
        {/* Schedule Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          {filteredSessions.length > 0 ? (
            // Full header with all features for users with sessions
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Study Schedule</h1>
                  <p className="text-gray-600 mt-1">
                    {filteredSessions.length} sessions planned • Smart AI ordering
                  </p>
                </div>

                {/* View Mode Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => {
                      trackEvent('view_mode_changed', {
                        newMode: 'calendar',
                        previousMode: viewMode,
                      });
                      setViewMode('calendar');
                    }}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'calendar'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    📅 Week
                  </button>
                  <button
                    onClick={() => {
                      trackEvent('view_mode_changed', {
                        newMode: 'month',
                        previousMode: viewMode,
                      });
                      setViewMode('month');
                    }}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'month'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    📅 Month
                  </button>
                  <button
                    onClick={() => {
                      trackEvent('view_mode_changed', {
                        newMode: 'stack',
                        previousMode: viewMode,
                      });
                      setViewMode('stack');
                    }}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'stack'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🗂️ Focus Stack
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* XP & Streak Bar - Calendar & Month Views */}
                {(viewMode === 'calendar' || viewMode === 'month') && (
                  <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 px-3 py-1.5 rounded-full border border-blue-200">
                    <div className="flex items-center gap-1 text-xs font-medium text-blue-700">
                      <span className="text-blue-600">⚡</span>+
                      {filteredSessions.reduce((sum, s) => sum + (s.xpReward || 0), 0)} XP
                      possible
                    </div>
                    <div className="w-px h-3 bg-blue-300" />
                    <div className="flex items-center gap-1 text-xs font-medium text-purple-700">
                      <span className="text-purple-600">🔥</span>
                      {scheduleState.completedSessions.size > 0 ? `${scheduleState.completedSessions.size} completed` : 'start your streak'}
                    </div>
                  </div>
                )}

                {/* AI Autofill - Calendar & Month Views */}
                {(viewMode === 'calendar' || viewMode === 'month') && (
                  <Button
                    onClick={() => setShowAutofillDialog(true)}
                    disabled={autofillLoading}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {autofillLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent mr-2" />
                        AI Filling...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-1" />
                        AI Autofill
                      </>
                    )}
                  </Button>
                )}

                <Button variant="ghost" size="sm">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Insights
                </Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Session
                </Button>
              </div>
            </>
          ) : (
            // Minimal header for new users - just the essentials
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Study Schedule</h1>
                <p className="text-gray-600 mt-1">
                  Start your focused study journey
                </p>
              </div>
              
              {/* Only show Add Session button for empty state */}
              <Button 
                onClick={handleCreateSession}
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Session
              </Button>
            </div>
          )}
        </div>

        {/* Main Content */}
        {isLoading ? (
          <ScheduleLoadingState />
        ) : filteredSessions.length === 0 ? (
          <ScheduleEmptyState
            userCoursesCount={userCourses.length}
            onBrowseCourses={handleBrowseCourses}
            onCreateSession={handleCreateSession}
          />
        ) : (
          /* Conditional View Rendering */
          viewMode === 'calendar' ? (
            <OriginalCalendarView
              sessions={filteredSessions}
              getCourseStyle={getCourseStyle}
              onSessionSelect={selectSession}
              onSessionStart={startSession}
              onSessionComplete={completeSession}
              onViewModeChange={setViewMode}
            />
          ) : viewMode === 'month' ? (
            <OriginalMonthView
              sessions={filteredSessions}
              getCourseStyle={getCourseStyle}
              onSessionSelect={selectSession}
              onViewModeChange={setViewMode}
            />
          ) : (
            renderStackView()
          )
        )}
      </div>

      {/* Onboarding Modal */}
      <ScheduleOnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        onComplete={handleOnboardingComplete}
        userCourses={userCourses}
      />
    </SharedDashboardLayout>
  );
}