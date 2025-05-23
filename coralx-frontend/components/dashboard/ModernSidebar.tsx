"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { signOut } from "firebase/auth";
import { auth } from "@/firebaseconfig";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Home,
  GraduationCap,
  Settings,
  User,
  LogOut,
  Plus,
  Bell,
  Search,
  Brain,
  Upload,
  MessageSquare,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

interface Course {
  id: string;
  title: string;
  code: string;
  color?: string;
  unreadCount?: number;
  lastActivity?: string;
}

interface ModernSidebarProps {
  className?: string;
  onCollapseChange?: (value: boolean) => void;
  userRole: "student" | "instructor" | "admin";
  courses?: Course[];
  currentUser?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
}

const courseColors = [
  "course-blue",
  "course-green", 
  "course-purple",
  "course-orange",
  "course-red",
  "course-teal"
];

const ModernSidebar = ({ 
  className, 
  onCollapseChange, 
  userRole,
  courses = [],
  currentUser
}: ModernSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hoveredCourse, setHoveredCourse] = useState<string | null>(null);
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // Default to collapsed on mobile
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

  useEffect(() => {
    // Close sidebar on mobile when route changes
    if (isMobile) {
      setCollapsed(true);
    }
  }, [pathname, isMobile]);

  const toggleSidebar = () => {
    const newValue = !collapsed;
    setCollapsed(newValue);
    if (onCollapseChange) onCollapseChange(newValue);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const mainNavItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: Home,
      active: pathname === "/dashboard",
    },
    {
      name: "All Courses",
      path: "/courses",
      icon: GraduationCap,
      active: pathname === "/courses",
    },
    ...(userRole === "student" ? [{
      name: "My Courses",
      path: "/my-courses",
      icon: BookOpen,
      active: pathname === "/my-courses",
    }] : []),
    ...(userRole === "instructor" ? [{
      name: "Analytics",
      path: "/analytics",
      icon: BarChart3,
      active: pathname === "/analytics",
    }] : []),
  ];

  const bottomNavItems = [
    {
      name: "Settings",
      path: "/settings",
      icon: Settings,
      active: pathname === "/settings",
    },
  ];

  // Don't render anything during first mount to avoid layout shifts
  if (!mounted) return null;

  return (
    <>
      {/* Overlay for mobile */}
      {!collapsed && isMobile && (
        <div
          className="fixed inset-0 bg-black/60 z-40 animate-fade-in backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-screen z-50 flex flex-col",
          "sidebar-bg border-r sidebar-border",
          collapsed ? "w-16" : "w-64",
          isMobile && collapsed ? "translate-x-[-100%]" : "translate-x-0",
          "transition-all duration-300 ease-in-out",
          className
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b sidebar-border bg-white/50">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/images/LearnXLogo.png"
                alt="LEARN-X Logo"
                width={120}
                height={40}
                className="h-8 w-auto object-contain"
                priority
              />
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(
              "h-8 w-8 rounded-full hover:bg-gray-100",
              collapsed && "mx-auto"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Main Navigation */}
        <div className="px-3 py-4">
          <nav className="space-y-1">
            {mainNavItems.map((item) => (
              <TooltipProvider key={item.path} delayDuration={collapsed ? 200 : 1000}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.path}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        "hover:bg-gray-100",
                        item.active 
                          ? "sidebar-active-bg sidebar-active shadow-sm" 
                          : "sidebar-text hover:sidebar-text"
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <span className="truncate">{item.name}</span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>{item.name}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            ))}
          </nav>
        </div>

        {/* Courses Section */}
        <div className="flex-1 px-3 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            {!collapsed && (
              <h3 className="text-sm font-semibold sidebar-text">My Courses</h3>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-gray-100"
                    onClick={() => router.push("/courses?action=join")}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Join Course</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Courses List */}
          <div className="space-y-1 overflow-y-auto hide-scrollbar">
            {courses.map((course, index) => {
              const colorIndex = parseInt(course.id, 10) % courseColors.length;
              const courseColor = course.color || courseColors[colorIndex];
              const isHovered = hoveredCourse === course.id;
              
              return (
                <TooltipProvider key={course.id} delayDuration={collapsed ? 200 : 1000}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "group relative rounded-lg transition-all duration-200",
                          "hover:bg-gray-50 cursor-pointer"
                        )}
                        onMouseEnter={() => setHoveredCourse(course.id)}
                        onMouseLeave={() => setHoveredCourse(null)}
                        onClick={() => router.push(`/courses/${course.id}`)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2">
                          {/* Course Color Indicator */}
                          <div className="flex-shrink-0">
                            <Circle 
                              className={cn("h-3 w-3", courseColor)} 
                              fill="currentColor"
                            />
                          </div>
                          
                          {!collapsed && (
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium sidebar-text truncate">
                                  {course.title}
                                </p>
                                {course.unreadCount && course.unreadCount > 0 && (
                                  <Badge 
                                    variant="destructive" 
                                    className="text-xs px-1.5 py-0.5 ml-2"
                                  >
                                    {course.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs sidebar-text-muted truncate">
                                {course.code}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Quick Actions on Hover */}
                        {!collapsed && isHovered && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle upload
                              }}
                            >
                              <Upload className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle AI chat
                              }}
                            >
                              <Brain className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">
                        <div>
                          <p className="font-medium">{course.title}</p>
                          <p className="text-xs text-gray-500">{course.code}</p>
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="px-3 py-4 border-t sidebar-border bg-white/50">
          {/* Bottom Navigation */}
          <nav className="space-y-1 mb-4">
            {bottomNavItems.map((item) => (
              <TooltipProvider key={item.path} delayDuration={collapsed ? 200 : 1000}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.path}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        "hover:bg-gray-100",
                        item.active 
                          ? "sidebar-active-bg sidebar-active" 
                          : "sidebar-text"
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <span className="truncate">{item.name}</span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>{item.name}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            ))}
          </nav>

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentUser?.avatar} />
              <AvatarFallback>
                {currentUser?.name ? currentUser.name[0].toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
            
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium sidebar-text truncate">
                  {currentUser?.name || "User"}
                </p>
                <p className="text-xs sidebar-text-muted truncate">
                  {currentUser?.email || ""}
                </p>
              </div>
            )}
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-gray-100"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Sign Out</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </aside>
    </>
  );
};

export default ModernSidebar; 