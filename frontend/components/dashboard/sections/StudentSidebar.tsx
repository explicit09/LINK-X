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

  const navigationItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'My Courses', path: '/my-courses' },
    { icon: Target, label: 'Study Plan', path: '/study-plan' },
    { icon: Calendar, label: 'Schedule', path: '/schedule' },
    { icon: Trophy, label: 'Progress', path: '/progress' },
    { icon: Award, label: 'Gamification', path: '/dashboard/gamification' },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
  ];

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
          <h2 className="font-bold text-xl text-primary">LEARN-X</h2>
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

      {/* User Info */}
      {currentUser && (
        <div className={cn('p-4 border-b border-gray-200', isCollapsed && 'px-2')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
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
        {navigationItems.map((item) => {
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