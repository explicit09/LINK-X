"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast as sonnerToast } from 'sonner';
import { cn } from "@/lib/utils";

// Import all modular components
import { StudentSidebar } from "./sections/StudentSidebar";
import { PersonalizedHeader } from "./sections/PersonalizedHeader";
import { WeeklyMission } from "./sections/WeeklyMission";
import { PriorityCards } from "./sections/PriorityCards";
import { ModernCoursesSection } from "./sections/ModernCoursesSection";
import { PerformancePulse } from "./sections/PerformancePulse";
import { AIStudyCoach } from "./sections/AIStudyCoach";
import { TodaysSchedule } from "./sections/TodaysSchedule";

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
  courses = [] 
}: ModernStudentDashboardProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    router.push("/my-courses");
  };

  const handleGetStudyPlan = () => {
    sonnerToast.success("Generating personalized study plan...");
    // Could open a modal or navigate to study plan page
  };

  const handleScheduleItemClick = (item: any) => {
    sonnerToast.success(`Opening: ${item.title}`);
    // Navigate to specific course or task
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
        
        {/* Dashboard Content */}
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
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
                <TodaysSchedule onItemClick={handleScheduleItemClick} />
                <PerformancePulse />
                <AIStudyCoach onGetStudyPlan={handleGetStudyPlan} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModernStudentDashboard;