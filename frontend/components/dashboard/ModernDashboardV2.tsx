'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Users,
  TrendingUp,
  Clock,
  Search,
  Plus,
  ChevronRight,
  Sparkles,
  BarChart,
  Calendar,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  Activity,
  Brain,
  X,
} from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  delay?: number;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  change,
  icon,
  trend = 'neutral',
  delay = 0,
}) => {
  const trendIcons = {
    up: <ArrowUp className="w-4 h-4" />,
    down: <ArrowDown className="w-4 h-4" />,
    neutral: null,
  };

  const trendColors = {
    up: 'text-[#2563EB]',
    down: 'text-red-500',
    neutral: 'text-gray-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="group relative overflow-hidden bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-wider text-gray-500">
                {title}
              </p>
              <p className="text-4xl font-semibold text-gray-900">{value}</p>
              {change && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-sm font-medium',
                    trendColors[trend],
                  )}
                >
                  {trendIcons[trend]}
                  <span>{change}</span>
                </div>
              )}
            </div>
            <motion.div
              className="p-3 bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] text-white rounded-xl shadow-md"
              whileHover={{ scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              {icon}
            </motion.div>
          </div>
          {/* Animated accent bar */}
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#2563EB] to-[#1d4ed8]"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1, delay: delay + 0.3 }}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface CourseCardProps {
  id: string;
  title: string;
  code: string;
  students: number;
  progress: number;
  color: string;
  lastActivity?: string;
  onClick: () => void;
}

const CourseCard: React.FC<CourseCardProps & { index: number }> = ({
  title,
  code,
  students,
  progress,
  color,
  lastActivity,
  onClick,
  index,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card
        className="group cursor-pointer overflow-hidden bg-white border-0 shadow-lg hover:shadow-2xl transition-all duration-300"
        onClick={onClick}
      >
        <motion.div
          className={cn('h-3 w-full', color)}
          animate={{ scaleX: isHovered ? 1.05 : 1 }}
          transition={{ duration: 0.3 }}
        />
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {title}
              </h3>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                {code}
              </p>
            </div>
            <motion.div
              animate={{ x: isHovered ? 5 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-6 h-6 text-[#2563EB]" />
            </motion.div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-gray-600">
                  Course Progress
                </span>
                <span className="font-semibold text-gray-900">{progress}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#2563EB] to-[#1d4ed8]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, delay: index * 0.1 + 0.5 }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <Users className="w-4 h-4 text-gray-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {students} students
                </span>
              </div>
              {lastActivity && (
                <span className="text-xs font-medium text-gray-500">
                  {lastActivity}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface ModernDashboardV2Props {
  userRole: 'student' | 'instructor' | 'admin';
  currentUser?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  courses?: any[];
}

export default function ModernDashboardV2({
  userRole,
  currentUser,
  courses = [],
}: ModernDashboardV2Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'semester' | 'ai' | null>(
    'semester',
  );
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const { toast } = useToast();

  const stats = {
    totalCourses: courses.length,
    activeStudents: 1284,
    completionRate: 78,
    avgEngagement: 4.2,
  };

  const handleNewCourse = () => {
    toast({
      title: 'Coming Soon',
      description: 'Course creation will be available in the next update.',
    });
  };

  const handleCourseClick = (courseId: string) => {
    window.location.href = `/courses/${courseId}`;
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          {/* Welcome Section with Hero Animation */}
          <section className="pt-8 pb-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-between"
            >
              <div>
                <h1 className="text-4xl font-semibold text-gray-900 mb-2">
                  Welcome back, {currentUser?.name || 'Thabang Kimara'}!
                </h1>
                <p className="text-lg text-gray-600">
                  Here&apos;s what&apos;s happening with your courses today.
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={handleNewCourse}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  New Course
                </Button>
              </motion.div>
            </motion.div>
          </section>

          {/* Stats Grid with Entrance Animations */}
          <section className="pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <DashboardCard
                title="Total Courses"
                value={stats.totalCourses}
                icon={<BookOpen className="w-6 h-6" />}
                trend="neutral"
                delay={0}
              />
              <DashboardCard
                title="Active Students"
                value={stats.activeStudents.toLocaleString()}
                change="+12% from last month"
                icon={<Users className="w-6 h-6" />}
                trend="up"
                delay={0.1}
              />
              <DashboardCard
                title="Completion Rate"
                value={`${stats.completionRate}%`}
                change="+3% from last week"
                icon={<TrendingUp className="w-6 h-6" />}
                trend="up"
                delay={0.2}
              />
              <DashboardCard
                title="Avg. Engagement"
                value={`${stats.avgEngagement}/5`}
                change="Excellent"
                icon={<BarChart className="w-6 h-6" />}
                trend="neutral"
                delay={0.3}
              />
            </div>
          </section>

          {/* Search and Filters with Pill Buttons */}
          <section className="pb-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex gap-4 items-center flex-wrap"
            >
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 bg-white border-gray-200 shadow-sm focus:shadow-md focus:border-[#2563EB] transition-all duration-300"
                />
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    setActiveFilter(
                      activeFilter === 'semester' ? null : 'semester',
                    )
                  }
                  className={cn(
                    'px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2',
                    activeFilter === 'semester'
                      ? 'bg-[#2563EB] text-white shadow-lg'
                      : 'bg-white text-gray-700 shadow-sm hover:shadow-md border border-gray-200',
                  )}
                >
                  <Calendar className="w-4 h-4" />
                  This Semester
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    setActiveFilter(activeFilter === 'ai' ? null : 'ai')
                  }
                  className={cn(
                    'px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2',
                    activeFilter === 'ai'
                      ? 'bg-[#2563EB] text-white shadow-lg'
                      : 'bg-white text-gray-700 shadow-sm hover:shadow-md border border-gray-200',
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  AI Suggestions
                </motion.button>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowActivityPanel(true)}
                className="ml-auto px-6 py-2.5 rounded-full font-medium bg-white text-gray-700 shadow-sm hover:shadow-md border border-gray-200 transition-all duration-300 flex items-center gap-2"
              >
                <Activity className="w-4 h-4" />
                Activity & AI
              </motion.button>
            </motion.div>
          </section>

          {/* Courses Grid */}
          <section className="pb-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mb-6"
            >
              <h2 className="text-2xl font-medium text-gray-900">
                Your Courses
              </h2>
              <p className="text-base text-gray-600 mt-1">
                Click on any course to view details and manage content
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Sample course data - replace with actual courses */}
              {[
                {
                  id: '1',
                  title: 'Introduction to Computer Science',
                  code: 'CS101',
                  students: 245,
                  progress: 85,
                  color: 'bg-gradient-to-r from-blue-500 to-purple-500',
                  lastActivity: '2 hours ago',
                },
                {
                  id: '2',
                  title: 'Data Structures & Algorithms',
                  code: 'CS201',
                  students: 189,
                  progress: 72,
                  color: 'bg-gradient-to-r from-green-500 to-teal-500',
                  lastActivity: '1 day ago',
                },
                {
                  id: '3',
                  title: 'Web Development Fundamentals',
                  code: 'WEB101',
                  students: 312,
                  progress: 90,
                  color: 'bg-gradient-to-r from-orange-500 to-red-500',
                  lastActivity: '3 hours ago',
                },
                {
                  id: '4',
                  title: 'Machine Learning Basics',
                  code: 'ML101',
                  students: 156,
                  progress: 45,
                  color: 'bg-gradient-to-r from-purple-500 to-pink-500',
                  lastActivity: '5 hours ago',
                },
                {
                  id: '5',
                  title: 'Database Management Systems',
                  code: 'DB301',
                  students: 198,
                  progress: 68,
                  color: 'bg-gradient-to-r from-indigo-500 to-blue-500',
                  lastActivity: '1 week ago',
                },
                {
                  id: '6',
                  title: 'Mobile App Development',
                  code: 'MOB201',
                  students: 234,
                  progress: 55,
                  color: 'bg-gradient-to-r from-teal-500 to-cyan-500',
                  lastActivity: '2 days ago',
                },
              ].map((course, index) => (
                <CourseCard
                  key={course.id}
                  {...course}
                  index={index}
                  onClick={() => handleCourseClick(course.id)}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Right-hand Activity Drawer */}
      <AnimatePresence>
        {showActivityPanel && (
          <Sheet open={showActivityPanel} onOpenChange={setShowActivityPanel}>
            <SheetContent
              side="right"
              className="w-[480px] sm:w-[540px] overflow-y-auto"
            >
              <SheetHeader className="mb-6">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-2xl font-semibold text-gray-900">
                    Activity & AI Assistant
                  </SheetTitle>
                  <button
                    onClick={() => setShowActivityPanel(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </SheetHeader>

              <div className="space-y-8">
                {/* Recent Activity */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#2563EB]" />
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        icon: MessageSquare,
                        title: 'New discussion in CS101',
                        time: '5 minutes ago',
                        description:
                          'John Doe started a discussion about recursion',
                        color: 'bg-blue-100 text-blue-600',
                      },
                      {
                        icon: Clock,
                        title: 'Assignment deadline approaching',
                        time: '1 hour ago',
                        description: 'Data Structures Lab 3 due in 2 days',
                        color: 'bg-amber-100 text-amber-600',
                      },
                      {
                        icon: TrendingUp,
                        title: 'Course progress update',
                        time: '3 hours ago',
                        description: '15 students completed Module 4 in WEB101',
                        color: 'bg-green-100 text-green-600',
                      },
                    ].map((activity, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="flex gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-100"
                      >
                        <div className={cn('p-2.5 rounded-lg', activity.color)}>
                          <activity.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {activity.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {activity.time}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* AI Assistant */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-[#2563EB]" />
                    AI Assistant
                  </h3>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <h4 className="font-medium text-gray-900 mb-4">
                      Suggested Actions
                    </h4>
                    <ul className="space-y-3">
                      {[
                        'Review struggling students in CS201',
                        'Create quiz for WEB101 Module 5',
                        'Schedule office hours for ML101',
                        'Update course materials for next week',
                      ].map((suggestion, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                        >
                          <div className="p-1 bg-[#2563EB] rounded">
                            <Sparkles className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm text-gray-700 flex-1">
                            {suggestion}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full mt-6 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-5 h-5" />
                      Get More Suggestions
                    </motion.button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </AnimatePresence>

      <Toaster />
    </>
  );
}
