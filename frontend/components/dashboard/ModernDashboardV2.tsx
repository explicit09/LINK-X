'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  BookOpen,
  Users,
  TrendingUp,
  BarChart,
  Search,
  Plus,
  X,
} from 'lucide-react';

// Extracted components
import { DashboardStatCard } from './cards/DashboardStatCard';
import { ModernCourseCard } from './cards/ModernCourseCard';
import { RecentActivityPanel } from './sections/RecentActivityPanel';
import { AIAssistantPanel } from './sections/AIAssistantPanel';

// Extracted hook
import { useModernDashboard } from './hooks/useModernDashboard';

interface ModernDashboardV2Props {
  userRole?: 'professor' | 'student';
  userName?: string;
  className?: string;
}

/**
 * ModernDashboardV2 - Refactored dashboard component with modular architecture
 * REDUCED from 612 lines to ~200 lines by extracting components and hooks
 * PRESERVED all functionality while following DRY principles
 */
export default function ModernDashboardV2({
  userRole = 'professor',
  userName = 'Professor',
  className = '',
}: ModernDashboardV2Props) {
  const { toast } = useToast();
  const {
    stats,
    courses,
    searchQuery,
    isLoading,
    sidebarOpen,
    updateSearchQuery,
    toggleSidebar,
    closeSidebar,
    handleNewCourse,
  } = useModernDashboard();

  const dashboardCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      change: '+12% from last month',
      icon: <Users className="w-6 h-6" />,
      trend: 'up' as const,
      delay: 0,
    },
    {
      title: 'Active Courses',
      value: stats.activeCourses,
      change: '+2 new courses',
      icon: <BookOpen className="w-6 h-6" />,
      trend: 'up' as const,
      delay: 0.1,
    },
    {
      title: 'Engagement Rate',
      value: `${stats.engagementRate}%`,
      change: '+5.2% improvement',
      icon: <TrendingUp className="w-6 h-6" />,
      trend: 'up' as const,
      delay: 0.2,
    },
    {
      title: 'Completion Rate',
      value: `${stats.completionRate}%`,
      change: '+3.1% this week',
      icon: <BarChart className="w-6 h-6" />,
      trend: 'up' as const,
      delay: 0.3,
    },
  ];

  return (
    <>
      <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-white ${className}`}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {userName}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Here's what's happening with your courses today.
                </p>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => updateSearchQuery(e.target.value)}
                    className="pl-10 w-64 bg-gray-50 border-gray-200 focus:bg-white transition-colors duration-300"
                  />
                </div>
                <Button
                  onClick={handleNewCourse}
                  className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  New Course
                </Button>
                <Button
                  variant="outline"
                  onClick={toggleSidebar}
                  className="shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <BarChart className="w-5 h-5 mr-2" />
                  Analytics
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {dashboardCards.map((card, index) => (
              <DashboardStatCard
                key={card.title}
                title={card.title}
                value={card.value}
                change={card.change}
                icon={card.icon}
                trend={card.trend}
                delay={card.delay}
              />
            ))}
          </div>

          {/* Courses Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-8"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Your Courses</h2>
              <p className="text-sm text-gray-600">
                {courses.length} {courses.length === 1 ? 'course' : 'courses'} found
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-48 bg-gray-200 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course, index) => (
                  <ModernCourseCard
                    key={course.id}
                    {...course}
                    index={index}
                  />
                ))}
              </div>
            )}

            {courses.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No courses found matching your search.</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <Sheet open={sidebarOpen} onOpenChange={closeSidebar}>
            <SheetContent side="right" className="w-[400px] sm:w-[500px] overflow-y-auto">
              <SheetHeader className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-xl font-semibold text-gray-900">
                    Dashboard Analytics
                  </SheetTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeSidebar}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </SheetHeader>

              <div className="space-y-8 py-6">
                <RecentActivityPanel />
                <AIAssistantPanel />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </AnimatePresence>

      <Toaster />
    </>
  );
}