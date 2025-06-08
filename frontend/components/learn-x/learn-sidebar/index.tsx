'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { signOut } from '@/supabaseconfig';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProps } from './types';
import { useSidebar } from './hooks/useSidebar';
import {
  SidebarHeader,
  ProgressOverview,
  QuickActions,
  CourseContent,
  SidebarFooter,
} from './components';

const Sidebar: React.FC<SidebarProps> = ({
  className,
  onLessonSelect,
  onLoadingStart,
  onCollapseChange,
  courseId,
  pfId,
}) => {
  const router = useRouter();
  const {
    collapsed,
    mounted,
    chapters,
    selectedLesson,
    completedLessons,
    totalLessons,
    progressPercentage,
    toggleSidebar,
    handleLessonSelect,
  } = useSidebar(courseId, pfId, onCollapseChange);

  const handleChatClick = async (title: string, fullText: string) => {
    onLoadingStart?.();
    handleLessonSelect(title);
    onLessonSelect?.(title, fullText);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (!mounted) return null;

  return (
    <TooltipProvider>
      <div
        className={cn(
          'h-full bg-gradient-to-b from-gray-900 via-blue-900 to-indigo-900 text-white transition-all duration-300 ease-in-out border-r border-gray-700/50 shadow-2xl',
          collapsed ? 'w-16' : 'w-80',
          className,
        )}
      >
        <SidebarHeader collapsed={collapsed} onToggle={toggleSidebar} />

        {!collapsed && (
          <ProgressOverview
            progressPercentage={progressPercentage}
            completedLessons={completedLessons.size}
            totalLessons={totalLessons}
          />
        )}

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            <QuickActions collapsed={collapsed} />

            <div className="space-y-2">
              {!collapsed && (
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
                  Course Content
                </h3>
              )}

              <CourseContent
                chapters={chapters}
                collapsed={collapsed}
                selectedLesson={selectedLesson}
                completedLessons={completedLessons}
                onLessonClick={handleChatClick}
              />
            </div>
          </div>
        </ScrollArea>

        <SidebarFooter collapsed={collapsed} onSignOut={handleSignOut} />
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;
