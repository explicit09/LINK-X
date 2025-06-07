'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { StudentSidebar } from '../sections/StudentSidebar';
import { PersonalizedHeader } from '../sections/PersonalizedHeader';
import { CompressedProgressStrip } from '../sections/CompressedProgressStrip';
import { TaskCompletionFeedback } from '../sections/TaskCompletionFeedback';
import { MiniFooter } from '../../MiniFooter';
import { toast as sonnerToast } from 'sonner';
import { useRouter } from 'next/navigation';
import { UnifiedStudyMode } from '@/components/study';

interface CourseContext {
  id: string;
  title: string;
  code: string;
  instructor: string;
  progress: number;
  modules: number;
  isOwner: boolean;
}

interface SharedDashboardLayoutProps {
  children: React.ReactNode;
  currentUser?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  pageTitle?: string;
  showGamification?: boolean;
  showFocusMode?: boolean;
  className?: string;
  defaultSidebarOpen?: boolean;
  courseContext?: CourseContext;
}

export function SharedDashboardLayout({
  children,
  currentUser,
  pageTitle,
  showGamification = true,
  showFocusMode = true,
  className,
  defaultSidebarOpen = true,
  courseContext,
}: SharedDashboardLayoutProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(!defaultSidebarOpen);
  const [taskCompletion, setTaskCompletion] = useState<any>(null);

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
    // Show coming soon message instead of navigation
    alert('🔒 Progress analytics will be available after beta launch!');
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Fixed Sidebar */}
      <StudentSidebar
        currentUser={currentUser}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={setSidebarCollapsed}
        courseContext={courseContext}
      />

      {/* Main Content Area - Absolutely positioned to avoid any layout conflicts */}
      <div
        className={cn(
          'absolute top-0 right-0 bottom-0 transition-all duration-300',
          sidebarCollapsed ? 'left-16' : 'left-64',
        )}
      >
        {/* Header - Removed PersonalizedHeader to avoid duplicate greetings with ProgressiveDashboard */}

        {/* Page Content */}
        <div className="h-full overflow-y-auto">
          <div className="p-4 pb-12 md:pb-14">
            <div className="max-w-7xl mx-auto">
              {/* Compressed Progress Strip */}
              {showGamification && (
                <CompressedProgressStrip
                  onStreakClick={handleStreakClick}
                  onLevelClick={handleLevelClick}
                />
              )}

              {/* Page Title - Only show if not empty */}
              {pageTitle && pageTitle.trim() !== "" && (
                <div className="mb-4">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {pageTitle}
                  </h1>
                </div>
              )}

              {/* Page Content */}
              <div className={cn('space-y-6', className)}>{children}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Completion Feedback */}
      <TaskCompletionFeedback
        completion={taskCompletion}
        onClose={handleTaskCompletionClose}
        onViewProgress={handleViewProgress}
      />

      {/* Fixed Mini Footer */}
      <MiniFooter sidebarCollapsed={sidebarCollapsed} />

      {/* Unified Study Mode - replaces both Focus Mode and Floating Study Button */}
      <UnifiedStudyMode 
        courseId={courseContext?.id}
        courseTitle={courseContext?.title}
      />
    </div>
  );
}
