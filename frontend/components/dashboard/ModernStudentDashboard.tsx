'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast as sonnerToast } from 'sonner';
import { cn } from '@/lib/utils';

// Import all modular components
import { StudentSidebar } from './sections/StudentSidebar';
import { PersonalizedHeader } from './sections/PersonalizedHeader';
import { WeeklyMission } from './sections/WeeklyMission';
import { PriorityCards } from './sections/PriorityCards';
import { ModernCoursesSection } from './sections/ModernCoursesSection';
import { PerformancePulse } from './sections/PerformancePulse';
import { AIStudyCoach } from './sections/AIStudyCoach';
import { SmartActionEngine } from './sections/SmartActionEngine';
import { TodaysSchedule } from './sections/TodaysSchedule';
import { FocusMode } from './sections/FocusMode';
import { GamificationEngine } from './sections/GamificationEngine';
import { TaskCompletionFeedback } from './sections/TaskCompletionFeedback';

// Types
interface Course {
  id: string;
  title: string;
  code: string;
  term?: string;
  description?: string;
  published?: boolean;
  color?: string;
  lastActivity?: string;
  unreadCount?: number;
  materialsCount?: number;
  studentsCount?: number;
}

interface ModernStudentDashboardProps {
  currentUser?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  courses?: Course[];
}

export function ModernStudentDashboard({
  currentUser,
  courses = [],
}: ModernStudentDashboardProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [taskCompletion, setTaskCompletion] = useState<any>(null);

  // Event handlers
  const handlePriorityAction = (item: any) => {
    sonnerToast.success(`Starting: ${item.taskTitle}`);
    // Navigate to specific course/task
    router.push(`/courses/${item.id}`);
  };

  const handleCourseClick = (course: any) => {
    router.push(`/courses/${course.id}`);
  };

  const handleViewAllCourses = () => {
    router.push('/my-courses');
  };

  const handleGetStudyPlan = () => {
    sonnerToast.success('Generating personalized study plan...');
    // Could open a modal or navigate to study plan page
  };

  const handleScheduleItemClick = (item: any) => {
    sonnerToast.success(`Opening: ${item.title}`);
    // Navigate to specific course or task
  };

  const handleSmartAction = (action: any) => {
    sonnerToast.success(`🚀 Starting: ${action.action}`);

    // Simulate task completion after 3 seconds (demo)
    setTimeout(() => {
      setTaskCompletion({
        id: action.id,
        taskName: action.action,
        timeSpent: action.timeEstimate,
        xpGained:
          action.urgency === 'high'
            ? 75
            : action.urgency === 'medium'
              ? 50
              : 25,
        achievementUnlocked:
          action.urgency === 'high'
            ? {
                title: 'Deadline Crusher',
                description: 'Completed urgent task on time',
                icon: '🔥',
              }
            : undefined,
        performanceBoost: action.urgency === 'high' ? 12 : undefined,
        streakIncreased: true,
      });
    }, 3000);

    // Navigate to specific course or start action
    if (action.course) {
      router.push(`/courses/${action.course.toLowerCase()}`);
    }
  };

  const handleMaintainRank = () => {
    sonnerToast.success('🎯 Opening your personalized action plan!');
    router.push('/study-plan');
  };

  const handleFocusMode = (active: boolean) => {
    setFocusModeActive(active);
    if (active) {
      sonnerToast.success('🎯 Entering Focus Mode - eliminate distractions!');
    }
  };

  const handleStartPomodoro = () => {
    sonnerToast.success('⏱️ Pomodoro session started!');
  };

  const handleStreakClick = () => {
    sonnerToast.success('🔥 5-day streak! Keep the momentum going!');
  };

  const handleLevelClick = () => {
    sonnerToast.success('🎯 Level 12 progress! 160 XP to next level!');
  };

  const handleTaskCompletionClose = () => {
    setTaskCompletion(null);
  };

  const handleViewProgress = () => {
    setTaskCompletion(null);
    router.push('/progress');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <StudentSidebar
        currentUser={currentUser}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={setSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className={cn('flex-1 flex flex-col transition-all duration-300')}>
        {/* Header */}
        <PersonalizedHeader currentUser={currentUser} />

        {/* Dashboard Content */}
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Gamification Header */}
            <div className="mb-6">
              <GamificationEngine
                onStreakClick={handleStreakClick}
                onLevelClick={handleLevelClick}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Content - 3 columns */}
              <div className="lg:col-span-3 space-y-6">
                {/* Weekly Mission */}
                <WeeklyMission />

                {/* Priority Cards */}
                <PriorityCards onActionClick={handlePriorityAction} />

                {/* Courses Section */}
                <ModernCoursesSection
                  onCourseClick={handleCourseClick}
                  onViewAll={handleViewAllCourses}
                />
              </div>

              {/* Right Sidebar - 1 column */}
              <div className="lg:col-span-1 space-y-6">
                <SmartActionEngine onActionClick={handleSmartAction} />
                <TodaysSchedule onItemClick={handleScheduleItemClick} />
                <PerformancePulse onMaintainRank={handleMaintainRank} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Focus Mode */}
      <FocusMode
        isActive={focusModeActive}
        onToggle={handleFocusMode}
        onStartPomodoro={handleStartPomodoro}
      />

      {/* Task Completion Feedback */}
      <TaskCompletionFeedback
        completion={taskCompletion}
        onClose={handleTaskCompletionClose}
        onViewProgress={handleViewProgress}
      />
    </div>
  );
}

export default ModernStudentDashboard;
