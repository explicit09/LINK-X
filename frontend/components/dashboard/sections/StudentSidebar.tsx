'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
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
  Target
} from 'lucide-react';

interface StudentSidebarProps {
  currentUser?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  isCollapsed: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
}

export function StudentSidebar({ currentUser, isCollapsed, onToggleCollapse }: StudentSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navigationItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'My Courses', path: '/my-courses' },
    { icon: Target, label: 'Study Plan', path: '/study-plan' },
    { icon: Calendar, label: 'Schedule', path: '/schedule' },
    { icon: Trophy, label: 'Progress', path: '/progress' },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <div
      className={cn(
        'fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40',
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

      {/* Navigation */}
      <nav className="p-2">
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
    </div>
  );
}