"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { signOut } from "firebase/auth";
import { auth } from "@/firebaseconfig";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  Settings,
  LogOut,
  User,
  BookOpen,
  PlayCircle,
  CheckCircle,
  Clock,
  Brain,
  Sparkles,
  FileText,
  BarChart3,
  Home,
  Menu,
  X,
  Target,
  TrendingUp,
  Award,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

const Avatar = () => (
  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 border-2 border-white shadow-lg flex items-center justify-center overflow-hidden">
    <User className="h-5 w-5 text-white" />
  </div>
);

interface Subsection {
  title: string;
  fullText: string;
}

interface Chapter {
  chapterTitle: string;
  subsections: Subsection[];
}

interface ModernLearnSidebarProps {
  className?: string;
  onLessonSelect?: (title: string, response: string) => void;
  onLoadingStart?: () => void;
  onCollapseChange?: (value: boolean) => void;
  pfId?: string;
  isCollapsed?: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const ModernLearnSidebar = ({
  className,
  onLessonSelect,
  onLoadingStart,
  onCollapseChange,
  pfId,
  isCollapsed = false,
  isMobileOpen = false,
  onMobileClose,
}: ModernLearnSidebarProps) => {
  const [mounted, setMounted] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);

    async function fetchChapters() {
      try {
        if (!pfId) {
          console.warn("No pfId provided.");
          return;
        }

        const url = `http://localhost:8080/student/personalized-files/${pfId}`;
        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const content = data.content || data?.content?.chapters;
        const parsed = typeof content === "string" ? JSON.parse(content) : content;

        if (parsed?.chapters) {
          const formattedChapters: Chapter[] = parsed.chapters.map(
            (ch: any) => ({
              chapterTitle: ch.chapterTitle,
              subsections: ch.subsections.map((sub: any) => ({
                title: sub.title,
                fullText: sub.fullText,
              })),
            })
          );

          setChapters(formattedChapters);
          console.log("Loaded personalized chapters:", formattedChapters);
        } else {
          console.warn("No chapters found in personalized file content.");
        }
      } catch (err) {
        console.error("Failed to load content:", err);
      }
    }

    fetchChapters();
  }, [pfId]);

  const toggleSidebar = () => {
    const newValue = !isCollapsed;
    onCollapseChange?.(newValue);
  };

  const handleLessonClick = async (title: string, fullText: string) => {
    onLoadingStart?.();
    setSelectedLesson(title);
    setCompletedLessons(prev => new Set([...prev, title]));
    onLessonSelect?.(title, fullText);
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const totalLessons = chapters.reduce((acc, chapter) => acc + chapter.subsections.length, 0);
  const progressPercentage = totalLessons > 0 ? (completedLessons.size / totalLessons) * 100 : 0;

  if (!mounted) return null;

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "bg-white border-r border-gray-200 transition-all duration-300 ease-in-out shadow-sm z-50",
          // Desktop positioning
          "lg:fixed lg:inset-y-0 lg:left-0",
          isCollapsed ? "lg:w-16" : "lg:w-80",
          // Mobile positioning
          isMobile 
            ? cn(
                "fixed inset-y-0 left-0 w-80",
                isMobileOpen ? "translate-x-0" : "-translate-x-full"
              )
            : "",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="canvas-heading-3">LINK-X Learn</h1>
                <p className="text-xs text-purple-600 font-medium">AI-Enhanced Learning</p>
              </div>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="modern-hover sidebar-text-muted hover:sidebar-text"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Progress Overview */}
        {!isCollapsed && (
          <div className="p-4 border-b border-gray-200 bg-gray-50/50">
            <Card className="canvas-card border-0 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="canvas-small font-semibold text-gray-700 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="canvas-small text-gray-500">Overall Progress</span>
                    <span className="canvas-small font-semibold text-gray-900">{Math.round(progressPercentage)}%</span>
                  </div>
                  <Progress 
                    value={progressPercentage} 
                    className="h-2"
                  />
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                      <div className="text-green-700 font-semibold">{completedLessons.size}</div>
                      <div className="text-green-600">Done</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                      <div className="text-blue-700 font-semibold">{totalLessons - completedLessons.size}</div>
                      <div className="text-blue-600">Todo</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center">
                      <div className="text-purple-700 font-semibold">{totalLessons}</div>
                      <div className="text-purple-600">Total</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {/* Quick Actions */}
            {!isCollapsed && (
              <div className="mb-6">
                <h3 className="canvas-small font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                  Quick Actions
                </h3>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start sidebar-text-muted hover:sidebar-text hover:sidebar-hover modern-hover"
                    onClick={() => router.push('/dashboard')}
                  >
                    <Home className="h-4 w-4 mr-3" />
                    Back to Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start sidebar-text-muted hover:sidebar-text hover:sidebar-hover modern-hover"
                    onClick={() => router.push('/courses')}
                  >
                    <GraduationCap className="h-4 w-4 mr-3" />
                    All Courses
                  </Button>
                </div>
              </div>
            )}

            {/* Course Content */}
            <div className="space-y-3">
              {!isCollapsed && (
                <h3 className="canvas-small font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
                  Course Content
                </h3>
              )}
              
              {chapters.length === 0 ? (
                <div className="text-center py-8">
                  {!isCollapsed && (
                    <div>
                      <FileText className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                      <p className="canvas-small text-gray-500">Loading course content...</p>
                    </div>
                  )}
                </div>
              ) : (
                chapters.map((chapter, chapterIndex) => (
                  <div key={chapterIndex} className="space-y-2">
                    {/* Chapter Header */}
                    <div className={cn(
                      "canvas-card bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 p-3 rounded-lg",
                      !isCollapsed && "mb-2"
                    )}>
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        {!isCollapsed && (
                          <div className="flex-1">
                            <h4 className="canvas-small font-semibold text-blue-700 line-clamp-2">
                              {chapter.chapterTitle}
                            </h4>
                            <p className="text-xs text-blue-600">
                              {chapter.subsections.length} lessons
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subsections */}
                    <div className="space-y-1 ml-2">
                      {chapter.subsections.map((subsection, subsectionIndex) => {
                        const isCompleted = completedLessons.has(subsection.title);
                        const isSelected = selectedLesson === subsection.title;
                        
                        return (
                          <Tooltip key={subsectionIndex} delayDuration={isCollapsed ? 0 : 1000}>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleLessonClick(subsection.title, subsection.fullText)}
                                className={cn(
                                  "w-full transition-all duration-200 group canvas-card border-0 shadow-none hover:shadow-sm",
                                  isCollapsed ? "px-3 py-3" : "px-4 py-3 justify-start",
                                  isSelected 
                                    ? "bg-blue-600 text-white shadow-md hover:bg-blue-700" 
                                    : isCompleted
                                    ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                    : "sidebar-text-muted hover:sidebar-text hover:sidebar-hover"
                                )}
                              >
                                <div className="flex items-center gap-3 w-full">
                                  {isCompleted ? (
                                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                  ) : isSelected ? (
                                    <PlayCircle className="h-4 w-4 text-white flex-shrink-0" />
                                  ) : (
                                    <div className="h-4 w-4 rounded-full border-2 border-gray-400 flex-shrink-0 group-hover:border-blue-500 transition-colors" />
                                  )}
                                  
                                  {!isCollapsed && (
                                    <div className="flex-1 text-left">
                                      <p className="canvas-small font-medium line-clamp-2 leading-relaxed">
                                        {subsection.title}
                                      </p>
                                      {isCompleted && (
                                        <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700 text-xs">
                                          ✓ Completed
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </Button>
                            </TooltipTrigger>
                            {isCollapsed && (
                              <TooltipContent side="right" className="max-w-xs">
                                <p className="font-medium">{subsection.title}</p>
                                <p className="text-xs text-gray-500">From: {chapter.chapterTitle}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50/50">
          {!isCollapsed ? (
            <div className="space-y-3">
              {/* User Profile */}
              <div className="flex items-center gap-3">
                <Avatar />
                <div className="flex-1">
                  <p className="canvas-small font-medium sidebar-text">Learning Mode</p>
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-purple-500" />
                    <span className="text-xs text-purple-600 font-medium">AI Enhanced</span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 sidebar-text-muted hover:sidebar-text hover:sidebar-hover modern-hover"
                      onClick={() => router.push('/settings')}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 sidebar-text-muted hover:sidebar-text hover:sidebar-hover modern-hover"
                    >
                      <Bell className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSignOut}
                      className="flex-1 sidebar-text-muted hover:text-red-600 hover:bg-red-50 modern-hover"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sign Out</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full sidebar-text-muted hover:sidebar-text hover:sidebar-hover modern-hover"
                    onClick={() => router.push('/settings')}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Settings</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="w-full sidebar-text-muted hover:text-red-600 hover:bg-red-50 modern-hover"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign Out</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default ModernLearnSidebar; 