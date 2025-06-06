'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  FolderOpen,
  FileText,
  GraduationCap,
  Users,
  MessageSquare,
  FileCheck,
  Calendar,
  BarChart3,
  Settings,
} from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  roles?: ('student' | 'instructor' | 'admin')[];
}

interface CanvasCourseTabsProps {
  courseId: string;
  userRole: 'student' | 'instructor' | 'admin';
  className?: string;
}

export function CanvasCourseTabs({ courseId, userRole, className }: CanvasCourseTabsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  // Define all available tabs
  const allTabs: Tab[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      href: `/courses/${courseId}`,
    },
    {
      id: 'modules',
      label: 'Modules',
      icon: FolderOpen,
      href: `/courses/${courseId}/modules`,
    },
    {
      id: 'assignments',
      label: 'Assignments',
      icon: FileCheck,
      href: `/courses/${courseId}/assignments`,
    },
    {
      id: 'grades',
      label: 'Grades',
      icon: GraduationCap,
      href: `/courses/${courseId}/grades`,
    },
    {
      id: 'people',
      label: 'People',
      icon: Users,
      href: `/courses/${courseId}/people`,
      roles: ['instructor', 'admin'],
    },
    {
      id: 'files',
      label: 'Files',
      icon: FileText,
      href: `/courses/${courseId}/files`,
    },
    {
      id: 'discussions',
      label: 'Discussions',
      icon: MessageSquare,
      href: `/courses/${courseId}/discussions`,
    },
    {
      id: 'syllabus',
      label: 'Syllabus',
      icon: Calendar,
      href: `/courses/${courseId}/syllabus`,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      href: `/courses/${courseId}/analytics`,
      roles: ['instructor', 'admin'],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      href: `/courses/${courseId}/settings`,
      roles: ['instructor', 'admin'],
    },
  ];

  // Filter tabs based on user role
  const visibleTabs = allTabs.filter(tab => {
    if (!tab.roles) return true; // Tab is visible to all roles
    return tab.roles.includes(userRole);
  });

  // Determine active tab
  const isTabActive = (tab: Tab) => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    
    if (tab.id === 'home') {
      // Home tab is active when no tab param or explicitly home
      return !tabParam || tabParam === 'home';
    }
    // Other tabs are active when the tab param matches
    return tabParam === tab.id;
  };

  const handleTabClick = (tab: Tab) => {
    // For now, we'll handle tab switching on the same page instead of navigation
    // This prevents 404 errors since those routes don't exist yet
    if (tab.id === 'home') {
      router.push(`/courses/${courseId}`);
    } else {
      // Stay on the same page but update the URL hash or query param
      // The parent component will handle tab switching
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab.id);
      window.history.pushState({}, '', url.toString());
      
      // Trigger a custom event that the parent can listen to
      window.dispatchEvent(new CustomEvent('tabChange', { detail: { tabId: tab.id } }));
      
      // Force re-render to update active state
      setTimeout(() => forceUpdate(), 0);
    }
  };

  return (
    <div className={cn("bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm", className)}>
      <div className="px-6">
        <div className="max-w-7xl mx-auto">
          <nav className="flex space-x-2 -mb-px" role="tablist">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = isTabActive(tab);
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={cn(
                    "group relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-200",
                    "hover:text-blue-600 hover:bg-blue-50 rounded-t-lg",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
                    isActive
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-600"
                  )}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`${tab.id}-panel`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-sm" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}