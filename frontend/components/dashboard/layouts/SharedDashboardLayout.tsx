"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { StudentSidebar } from "../sections/StudentSidebar";
import { PersonalizedHeader } from "../sections/PersonalizedHeader";
import { GamificationEngine } from "../sections/GamificationEngine";
import { FocusMode } from "../sections/FocusMode";
import { TaskCompletionFeedback } from "../sections/TaskCompletionFeedback";
import { toast as sonnerToast } from 'sonner';
import { useRouter } from "next/navigation";

interface SharedDashboardLayoutProps {
  children: React.ReactNode;
  currentUser?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  pageTitle?: string;
  showGamification?: boolean;
  className?: string;
}

export function SharedDashboardLayout({
  children,
  currentUser,
  pageTitle,
  showGamification = true,
  className
}: SharedDashboardLayoutProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [taskCompletion, setTaskCompletion] = useState<any>(null);

  const handleFocusMode = (active: boolean) => {
    setFocusModeActive(active);
    if (active) {
      sonnerToast.success("🎯 Entering Focus Mode - eliminate distractions!");
    }
  };

  const handleStartPomodoro = () => {
    sonnerToast.success("⏱️ Pomodoro session started!");
  };

  const handleStreakClick = () => {
    sonnerToast.success("🔥 5-day streak! Keep the momentum going!");
  };

  const handleLevelClick = () => {
    sonnerToast.success("🎯 Level 12 progress! 160 XP to next level!");
  };

  const handleTaskCompletionClose = () => {
    setTaskCompletion(null);
  };

  const handleViewProgress = () => {
    setTaskCompletion(null);
    router.push("/progress");
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
      <div className={cn("flex-1 flex flex-col transition-all duration-300")}>
        {/* Header */}
        <PersonalizedHeader currentUser={currentUser} />
        
        {/* Page Content */}
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Gamification Header */}
            {showGamification && (
              <div className="mb-6">
                <GamificationEngine 
                  onStreakClick={handleStreakClick}
                  onLevelClick={handleLevelClick}
                />
              </div>
            )}
            
            {/* Page Title */}
            {pageTitle && (
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
              </div>
            )}
            
            {/* Page Content */}
            <div className={cn("space-y-6", className)}>
              {children}
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