"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
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

const navigationItems: SidebarItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Home, href: "/dashboard" },
  { id: "courses", label: "Courses", icon: BookOpen, href: "/my-courses" },
  { id: "study-plan", label: "Study Plan", icon: Target, href: "/study-plan" },
  { id: "schedule", label: "Schedule", icon: Calendar, href: "/schedule" },
  { id: "progress", label: "Progress", icon: BarChart3, href: "/progress" },
  { id: "community", label: "Community", icon: Users, href: "/community", badge: 3 },
  { id: "messages", label: "Messages", icon: MessageSquare, href: "/messages", badge: 2 },
];

const bottomItems: SidebarItem[] = [
  { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
  { id: "help", label: "Help & Support", icon: HelpCircle, href: "/help" },
];

export function StudentSidebar({ 
  currentUser, 
  isCollapsed = false, 
  onToggleCollapse 
}: StudentSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const firstName = currentUser?.name?.split(" ")[0] || "Student";

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const handleToggle = () => {
    onToggleCollapse?.(!isCollapsed);
  };

  return (
    <div className={cn(
      "h-screen bg-gray-900 text-white flex flex-col transition-all duration-300 relative",
      isCollapsed ? "w-16" : "w-64"
    )}>
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
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => handleNavigation(item.href)}
              className={cn(
                "w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800",
                isActive && "bg-gray-800 text-white",
                isCollapsed ? "px-2" : "px-3"
              )}
            >
              <IconComponent className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Button>
          );
        })}
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
                "w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800",
                isActive && "bg-gray-800 text-white",
                isCollapsed ? "px-2" : "px-3"
              )}
            >
              <IconComponent className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
              {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
            </Button>
          );
        })}
      </div>
    </div>
  );
}