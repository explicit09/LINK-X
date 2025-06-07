'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  BookOpen,
  Calendar,
  Trophy,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  Target,
  LogOut,
  Award
} from 'lucide-react';
import { useDashboardMode, DashboardMode } from '@/hooks/useDashboardMode';
import { useGamification } from '@/contexts/GamificationContext';
import { useStudyTime } from '@/hooks/useStudyTime';
import { FadeInCard, AnimatedNumber } from '@/components/dashboard/animations/CSSAnimations';

interface CourseContext {
  id: string;
  title: string;
  code: string;
  instructor: string;
  progress: number;
  modules: number;
  isOwner: boolean;
}

interface StudentSidebarProps {
  currentUser?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  isCollapsed: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
  courseContext?: CourseContext;
}

export function StudentSidebar({ currentUser, isCollapsed, onToggleCollapse, courseContext }: StudentSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { mode, config } = useDashboardMode();
  const { userStats } = useGamification();
  const { weeklyStudyHours } = useStudyTime('week');
  
  // Calculate dynamic sidebar state
  const sidebarState = {
    level: Math.floor((userStats?.total_xp || 0) / 100),
    xpProgress: ((userStats?.total_xp || 0) % 100),
    streak: userStats?.current_streak || 0,
    studyHours: weeklyStudyHours,
    hasActiveSession: false // TODO: Connect to active session state
  };
  
  // Smart notification badges
  const getNotificationCount = (path: string) => {
    switch (path) {
      case '/my-courses':
        return courseContext ? 0 : (userStats?.total_xp || 0) > 0 && config.coursesCount === 0 ? 1 : 0;
      case '/study-plan':
        return sidebarState.level >= 1 && weeklyStudyHours < 2 ? 1 : 0;
      case '/progress':
        return sidebarState.streak >= 7 ? 1 : 0;
      case '/dashboard/gamification':
        return sidebarState.xpProgress >= 90 ? 1 : 0;
      default:
        return 0;
    }
  };

  // Adaptive navigation based on dashboard mode with smart ordering
  const getNavigationItems = () => {
    const baseItems = [
      { 
        icon: Home, 
        label: 'Dashboard', 
        path: '/dashboard',
        priority: 10,
        alwaysShow: true
      }
    ];

    const allItems = [
      { 
        icon: User, 
        label: mode === DashboardMode.WELCOME ? 'Profile Setup' : 'Profile', 
        path: mode === DashboardMode.WELCOME ? '/onboarding' : '/settings',
        priority: mode === DashboardMode.WELCOME ? 9 : 2,
        showInModes: [DashboardMode.WELCOME]
      },
      { 
        icon: BookOpen, 
        label: mode === DashboardMode.WELCOME ? 'Add Course' : 'My Courses', 
        path: '/my-courses',
        priority: config.coursesCount === 0 ? 8 : 7,
        alwaysShow: true,
        urgent: config.coursesCount === 0 && (userStats?.total_xp || 0) > 0
      },
      { 
        icon: Target, 
        label: 'Study Plan', 
        path: '/study-plan',
        priority: weeklyStudyHours < 2 ? 6 : 5,
        showInModes: [DashboardMode.GUIDED, DashboardMode.STANDARD, DashboardMode.ADVANCED],
        highlight: sidebarState.level >= 1 && weeklyStudyHours < 2
      },
      { 
        icon: Calendar, 
        label: 'Schedule', 
        path: '/schedule',
        priority: 4,
        showInModes: [DashboardMode.STANDARD, DashboardMode.ADVANCED]
      },
      { 
        icon: Trophy, 
        label: 'Progress', 
        path: '/progress',
        priority: sidebarState.streak >= 7 ? 6 : 3,
        showInModes: [DashboardMode.GUIDED, DashboardMode.STANDARD, DashboardMode.ADVANCED],
        highlight: sidebarState.streak >= 7
      },
      { 
        icon: Award, 
        label: 'Gamification', 
        path: '/dashboard/gamification',
        priority: sidebarState.xpProgress >= 90 ? 5 : 2,
        showInModes: [DashboardMode.STANDARD, DashboardMode.ADVANCED],
        highlight: sidebarState.xpProgress >= 90
      },
      { 
        icon: MessageSquare, 
        label: 'Community', 
        path: '/community',
        priority: 1,
        showInModes: [DashboardMode.ADVANCED]
      },
      { 
        icon: MessageSquare, 
        label: 'Analytics', 
        path: '/analytics',
        priority: 1,
        showInModes: [DashboardMode.ADVANCED]
      }
    ];

    return [
      ...baseItems,
      ...allItems
        .filter(item => 
          item.alwaysShow || 
          !item.showInModes || 
          item.showInModes.includes(mode)
        )
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    ];
  };

  const navigationItems = getNavigationItems();

  const bottomNavigationItems = [
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleSignOut = async () => {
    try {
      // Import signOut from supabaseconfig
      const { signOut } = await import('@/supabaseconfig');
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div
      className={cn(
        'fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40 flex flex-col',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo/Brand */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!isCollapsed && (
          <div>
            <h2 className="font-bold text-xl text-primary">LEARN-X</h2>
            {mode && (
              <p className="text-xs text-muted-foreground capitalize">
                {mode.replace('_', ' ')} Mode
              </p>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggleCollapse(!isCollapsed)}
          className="ml-auto"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* User Info with Smart Progress */}
      {currentUser && (
        <div className={cn('p-4 border-b border-gray-200', isCollapsed && 'px-2')}>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                {/* Level Badge */}
                {sidebarState.level > 0 && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center transition-all duration-300 animate-bounce-in">
                    <span className="text-xs font-bold text-white">{sidebarState.level}</span>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {currentUser.name || currentUser.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {currentUser.email}
                  </p>
                </div>
              )}
            </div>
            
            {/* Smart Progress Indicators */}
            {!isCollapsed && (
              <FadeInCard delay={0.2} className="space-y-2">
                {/* XP Progress */}
                {sidebarState.level > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Level Progress</span>
                      <span className="font-medium">{sidebarState.xpProgress}/100 XP</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${sidebarState.xpProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Dashboard Mode Indicator */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Mode</span>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-xs px-2 py-0.5",
                      mode === DashboardMode.WELCOME && "bg-green-100 text-green-700",
                      mode === DashboardMode.GUIDED && "bg-blue-100 text-blue-700",
                      mode === DashboardMode.STANDARD && "bg-purple-100 text-purple-700",
                      mode === DashboardMode.ADVANCED && "bg-yellow-100 text-yellow-700"
                    )}
                  >
                    {mode.replace('_', ' ')}
                  </Badge>
                </div>
                
                {/* Active Session Indicator */}
                {sidebarState.hasActiveSession && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200 transition-all duration-300 animate-bounce-in">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-green-700 font-medium">Study Session Active</span>
                  </div>
                )}
                
                {/* Streak Indicator */}
                {sidebarState.streak > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Streak</span>
                    <div className="flex items-center gap-1">
                      <span className="text-orange-500">🔥</span>
                      <span className="font-medium text-orange-600">{sidebarState.streak} days</span>
                    </div>
                  </div>
                )}
              </FadeInCard>
            )}
          </div>
        </div>
      )}

      {/* Course Info Card - shown when in course context */}
      {courseContext && !isCollapsed && (
        <div className="p-2 border-b border-gray-200">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-blue-700">Current Course</p>
                  <p className="font-semibold text-sm text-gray-900 truncate">
                    {courseContext.title}
                  </p>
                  <p className="text-xs text-gray-600">
                    {courseContext.code} • {courseContext.instructor}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{courseContext.progress}%</span>
                  </div>
                  <Progress value={courseContext.progress} className="h-1.5" />
                </div>
                
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-gray-600">
                    {courseContext.modules} modules
                  </span>
                  {courseContext.isOwner && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      Owner
                    </Badge>
                  )}
                </div>
                
                {/* Quick Navigation for Course */}
                <div className="pt-2 mt-2 border-t border-blue-200 space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => router.push(`/courses/${courseContext.id}?tab=modules`)}
                  >
                    <BookOpen className="h-3 w-3 mr-1.5" />
                    View Modules
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => router.push(`/courses/${courseContext.id}?tab=assignments`)}
                  >
                    <Target className="h-3 w-3 mr-1.5" />
                    Assignments
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Navigation - flex-1 to take up available space */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {navigationItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            const notificationCount = getNotificationCount(item.path);
            const isHighlighted = (item as any).highlight;
            const isUrgent = (item as any).urgent;
            
            return (
              <div
                key={item.path}
                className="transition-all duration-300 ease-out"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start mb-1 relative transition-all duration-200',
                    isCollapsed && 'justify-center px-2',
                    isHighlighted && 'bg-blue-50 border border-blue-200 text-blue-700',
                    isUrgent && 'bg-orange-50 border border-orange-200 text-orange-700 animate-pulse'
                  )}
                  onClick={() => handleNavigation(item.path)}
                >
                  <Icon className={cn(
                    'h-5 w-5', 
                    !isCollapsed && 'mr-3',
                    isHighlighted && 'text-blue-600',
                    isUrgent && 'text-orange-600'
                  )} />
                  {!isCollapsed && (
                    <span className="flex-1 text-left">{item.label}</span>
                  )}
                  
                  {/* Notification Badge */}
                  {notificationCount > 0 && (
                    <div
                      className={cn(
                        'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all duration-200 animate-bounce-in',
                        isCollapsed ? '-top-1 -right-1' : 'right-2',
                        isUrgent ? 'bg-orange-500' : 'bg-red-500'
                      )}
                    >
                      <AnimatedNumber value={notificationCount} duration={0.5} />
                    </div>
                  )}
                  
                  {/* Progress Indicator for Special Items */}
                  {!isCollapsed && item.path === '/dashboard/gamification' && sidebarState.xpProgress > 0 && (
                    <div className="ml-2 w-12">
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-blue-600 h-1 rounded-full transition-all duration-300" 
                          style={{ width: `${sidebarState.xpProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Button>
              </div>
            );
          })}
        });
      </nav>

      {/* Bottom Navigation - stays at absolute bottom */}
      <div className="mt-auto p-2 border-t border-gray-200">
        {bottomNavigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          
          return (
            <Button
              key={item.path}
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start mb-1',
                isCollapsed && 'justify-center px-2'
              )}
              onClick={() => handleNavigation(item.path)}
            >
              <Icon className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
              {!isCollapsed && <span>{item.label}</span>}
            </Button>
          );
        })}
        
        {/* Sign Out Button */}
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50',
            isCollapsed && 'justify-center px-2'
          )}
          onClick={handleSignOut}
        >
          <LogOut className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
          {!isCollapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </div>
  );
}