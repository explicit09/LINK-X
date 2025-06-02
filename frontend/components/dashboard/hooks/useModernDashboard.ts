'use client';

import { useState, useEffect } from 'react';

interface DashboardStats {
  totalStudents: number;
  activeCourses: number;
  engagementRate: number;
  completionRate: number;
}

interface Course {
  id: string;
  title: string;
  description?: string;
  students: number;
  modules: number;
  status: 'active' | 'draft' | 'archived';
  color: string;
  progress?: number;
}

interface DashboardData {
  stats: DashboardStats;
  courses: Course[];
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * useModernDashboard - Manages dashboard state and data
 * EXTRACTED from ModernDashboardV2.tsx to separate data logic from UI
 */
export const useModernDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    stats: {
      totalStudents: 1247,
      activeCourses: 8,
      engagementRate: 94.2,
      completionRate: 87.5,
    },
    courses: [
      {
        id: '1',
        title: 'Introduction to Computer Science',
        description: 'Learn the fundamentals of programming and computer science',
        students: 156,
        modules: 12,
        status: 'active',
        color: '#3B82F6',
        progress: 75,
      },
      {
        id: '2',
        title: 'Web Development Bootcamp',
        description: 'Full-stack web development with modern technologies',
        students: 89,
        modules: 16,
        status: 'active',
        color: '#10B981',
        progress: 60,
      },
      {
        id: '3',
        title: 'Data Structures & Algorithms',
        description: 'Advanced programming concepts and problem-solving',
        students: 134,
        modules: 14,
        status: 'active',
        color: '#F59E0B',
        progress: 40,
      },
      {
        id: '4',
        title: 'Mobile App Development',
        description: 'iOS and Android development fundamentals',
        students: 67,
        modules: 10,
        status: 'draft',
        color: '#EF4444',
        progress: 20,
      },
    ],
    searchQuery: '',
    isLoading: false,
    error: null,
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Simulated data loading
  useEffect(() => {
    setDashboardData(prev => ({ ...prev, isLoading: true }));
    
    // Simulate API call
    const timer = setTimeout(() => {
      setDashboardData(prev => ({ ...prev, isLoading: false }));
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const updateSearchQuery = (query: string) => {
    setDashboardData(prev => ({
      ...prev,
      searchQuery: query,
    }));
  };

  const filteredCourses = dashboardData.courses.filter(course =>
    course.title.toLowerCase().includes(dashboardData.searchQuery.toLowerCase()) ||
    course.description?.toLowerCase().includes(dashboardData.searchQuery.toLowerCase())
  );

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleNewCourse = () => {
    // Navigate to course creation or open modal
    console.log('Navigate to new course creation');
  };

  return {
    // Data
    stats: dashboardData.stats,
    courses: filteredCourses,
    searchQuery: dashboardData.searchQuery,
    isLoading: dashboardData.isLoading,
    error: dashboardData.error,
    
    // Sidebar state
    sidebarOpen,
    
    // Actions
    updateSearchQuery,
    toggleSidebar,
    closeSidebar,
    handleNewCourse,
  };
};