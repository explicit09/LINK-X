import { useState } from 'react';
import { Course } from './useCourses';

export type TabType = 'home' | 'modules' | 'people' | 'settings';
export type DashboardView = 'dashboard' | 'course-detail';

export function useProfessorNavigation() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [currentView, setCurrentView] = useState<DashboardView>('dashboard');

  // Select a course and navigate to course detail view
  const selectCourse = (course: Course) => {
    setSelectedCourse(course);
    setActiveTab('home');
    setCurrentView('course-detail');
  };

  // Navigate back to dashboard
  const backToDashboard = () => {
    setSelectedCourse(null);
    setCurrentView('dashboard');
    setActiveTab('home');
  };

  // Change active tab (only when in course detail view)
  const changeTab = (tab: TabType) => {
    if (currentView === 'course-detail') {
      setActiveTab(tab);
    }
  };

  // Check if currently viewing course details
  const isViewingCourse =
    currentView === 'course-detail' && selectedCourse !== null;

  // Check if specific tab is active
  const isTabActive = (tab: TabType) => activeTab === tab;

  return {
    selectedCourse,
    activeTab,
    currentView,
    selectCourse,
    backToDashboard,
    changeTab,
    isViewingCourse,
    isTabActive,
    setSelectedCourse,
    setActiveTab,
  };
}
