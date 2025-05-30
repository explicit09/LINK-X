"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Components
import Sidebar from "@/components/dashboard/DashSidebar";
import Footer from "@/components/landing/Footer";
import { CourseDashboard } from "./CourseDashboard";
import { CourseDetailView } from "./CourseDetailView";

// Hooks
import { useCourses } from "./hooks/useCourses";
import { useModules } from "./hooks/useModules";
import { useStudentManagement } from "./hooks/useStudentManagement";
import { useProfessorNavigation } from "./hooks/useProfessorNavigation";

export default function ProfessorDashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Custom hooks for data management
  const courseHooks = useCourses();
  const navigation = useProfessorNavigation();
  const moduleHooks = useModules(navigation.selectedCourse?.id || null);
  const studentHooks = useStudentManagement(navigation.selectedCourse?.id || null);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        
        {/* Main Content */}
        <div 
          className={cn(
            "flex-1 transition-all duration-300",
            isCollapsed ? "ml-16" : "ml-64"
          )}
        >
          <div className="min-h-screen pb-20">
            {navigation.isViewingCourse && navigation.selectedCourse ? (
              // Course Detail View
              <CourseDetailView
                course={navigation.selectedCourse}
                activeTab={navigation.activeTab}
                onTabChange={navigation.changeTab}
                onBackToDashboard={navigation.backToDashboard}
                courseHooks={courseHooks}
                moduleHooks={moduleHooks}
                studentHooks={studentHooks}
              />
            ) : (
              // Course Dashboard View
              <CourseDashboard
                courseHooks={courseHooks}
                onSelectCourse={navigation.selectCourse}
              />
            )}
          </div>
          
          {/* Footer */}
          <Footer />
        </div>
      </div>
    </div>
  );
}