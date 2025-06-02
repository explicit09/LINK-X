'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  BookOpen,
  Target,
  BarChart3,
  Users,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useHasData } from '@/hooks/useHasData';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  requiresData?: boolean;
}

interface StudentSidebarProps {
  currentUser?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

const primaryNavItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' },
  { id: 'study-plan', label: 'Study Plan', icon: Target, href: '/study-plan' },
  { id: 'schedule', label: 'Schedule', icon: Calendar, href: '/schedule' },
];

const secondaryNavItems: SidebarItem[] = [
  { id: 'courses', label: 'Courses', icon: BookOpen, href: '/my-courses' },
  { id: 'progress', label: 'Progress', icon: BarChart3, href: '/progress', requiresData: true },
  {
    id: 'community',
    label: 'Community',
    icon: Users,
    href: '/community',
    badge: 3,
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: MessageSquare,
    href: '/messages',
    badge: 2,
  },
];

const bottomItems: SidebarItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
  { id: 'help', label: 'Help & Support', icon: HelpCircle, href: '/help' },
];

export function StudentSidebar({
  currentUser,
  isCollapsed = false,
  onToggleCollapse,
}: StudentSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const userDataStatus = useHasData();
  const firstName = currentUser?.name?.split(' ')[0] || 'Student';

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const handleToggle = () => {
    onToggleCollapse?.(!isCollapsed);
  };

  return (
    <div
      className={cn(
        'fixed left-0 top-0 h-screen bg-gray-900 text-white flex flex-col transition-all duration-300 z-50',
        isCollapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentUser?.avatar} />
                <AvatarFallback className="bg-blue-600 text-white text-xs">
                  {firstName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{firstName}</p>
                <p className="text-xs text-gray-400">Student</p>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8 p-0"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {/* Primary Navigation */}
        <div className="space-y-1">
          {primaryNavItems.map((item) => {
            const IconComponent = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href);

            return (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  'w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 transition-all duration-200',
                  'hover:scale-105 hover:shadow-lg hover:bg-gradient-to-r hover:from-gray-800 hover:to-gray-700',
                  isActive &&
                    'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105',
                  isCollapsed ? 'px-2' : 'px-3',
                )}
              >
                <IconComponent
                  className={cn(
                    'h-4 w-4 transition-colors duration-200',
                    !isCollapsed && 'mr-3',
                    isActive && 'text-blue-100',
                  )}
                />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left font-medium">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Button>
            );
          })}
        </div>

        {/* Divider */}
        {!isCollapsed && <div className="border-t border-gray-700 my-3" />}

        {/* Secondary Navigation */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-3 py-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Learning
              </span>
            </div>
          )}

          {secondaryNavItems.map((item) => {
            const IconComponent = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href);
            const isLocked = item.requiresData && !userDataStatus.hasCourses && !userDataStatus.hasHistoricalMetrics;

            const button = (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => !isLocked && handleNavigation(item.href)}
                disabled={isLocked}
                className={cn(
                  'w-full justify-start transition-all duration-200',
                  isLocked
                    ? 'text-gray-600 hover:text-gray-600 cursor-not-allowed opacity-50'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800',
                  isActive && !isLocked && 'bg-gray-800 text-white',
                  isCollapsed ? 'px-2' : 'px-3 ml-3',
                )}
              >
                <div className="relative">
                  <IconComponent
                    className={cn('h-4 w-4', !isCollapsed && 'mr-3')}
                  />
                  {isLocked && isCollapsed && (
                    <Lock className="h-2.5 w-2.5 absolute -bottom-1 -right-1 text-gray-500" />
                  )}
                </div>
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left text-sm">
                      {item.label}
                    </span>
                    {isLocked && (
                      <Lock className="h-3 w-3 text-gray-500" />
                    )}
                    {item.badge && !isLocked && (
                      <span className="bg-orange-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center animate-bounce">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Button>
            );

            if (isLocked) {
              return (
                <TooltipProvider key={item.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Unlocked after first course</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }

            return button;
          })}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        {bottomItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = pathname === item.href;

          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => handleNavigation(item.href)}
              className={cn(
                'w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800',
                isActive && 'bg-gray-800 text-white',
                isCollapsed ? 'px-2' : 'px-3',
              )}
            >
              <IconComponent
                className={cn('h-4 w-4', !isCollapsed && 'mr-3')}
              />
              {!isCollapsed && (
                <span className="flex-1 text-left">{item.label}</span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
