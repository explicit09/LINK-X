"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
  X
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

interface OnboardingData {
  name: string;
  job: string;
  traits: string;
  learningStyle: string;
  depth: string;
  topics: string;
  interests: string;
  schedule: string;
  quizzes: boolean;
}

interface OnboardingResponse {
  name: string;
  answers: string[];
  quizzes: boolean;
}

interface SidebarProps {
  className?: string;
  onLessonSelect?: (title: string, response: string) => void;
  onLoadingStart?: () => void;
  onCollapseChange?: (value: boolean) => void;
  courseId?: string;
  pfId?: string;
}

const Sidebar = ({
  className,
  onLessonSelect,
  onLoadingStart,
  onCollapseChange,
  courseId,
  pfId,
}: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const isMobile = useIsMobile();
  const router = useRouter();

  const fetchOnboarding = async (): Promise<OnboardingData | null> => {
    try {
      const res = await fetch("http://localhost:8080/onboarding", {
        method: "GET",
        credentials: "include",
      });

      const data: OnboardingResponse = await res.json();

      if (res.status !== 200) {
        console.error("Failed to fetch onboarding:", data);
        return null;
      }

      const [job, traits, learningStyle, depth, topics, interests, schedule] =
        data.answers;

      const onboarding: OnboardingData = {
        name: data.name,
        job,
        traits,
        learningStyle,
        depth,
        topics,
        interests,
        schedule,
        quizzes: data.quizzes,
      };

      return onboarding;
    } catch (err) {
      console.error("Error loading onboarding data:", err);
      return null;
    }
  };

  useEffect(() => {
    setMounted(true);
    if (isMobile) setCollapsed(true);

    async function fetchChapters() {
      try {
        let url = "";
        if (pfId) {
          url = `http://localhost:8080/student/personalized-files/${pfId}`;
        } else if (courseId) {
          url = `http://localhost:8080/courses/${courseId}`;
        } else {
          console.warn("No courseId or pfId provided.");
          return;
        }

        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Expecting { id, content }
        const content = data.content || data?.content?.chapters;
        const parsed =
          typeof content === "string" ? JSON.parse(content) : content;

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
          console.log(
            "Loaded personalized chapters with fullText:",
            formattedChapters
          );
        } else {
          console.warn("No chapters found in personalized file content.");
        }
      } catch (err) {
        console.error("Failed to load content:", err);
      }
    }

    fetchChapters();
  }, [isMobile, courseId, pfId]);

  const toggleSidebar = () => {
    const newValue = !collapsed;
    setCollapsed(newValue);
    onCollapseChange?.(newValue);
  };

  const handleChatClick = async (title: string, fullText: string) => {
    onLoadingStart?.();
    setSelectedLesson(title);
    setCompletedLessons(prev => new Set([...prev, title]));
    
    // For now, just send the raw content
    onLessonSelect?.(title, fullText);
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
      <div
        className={cn(
          "h-full bg-gradient-to-b from-gray-900 via-blue-900 to-indigo-900 text-white transition-all duration-300 ease-in-out border-r border-gray-700/50 shadow-2xl",
          collapsed ? "w-16" : "w-80",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-black/20">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">LINK-X Learn</h1>
                <p className="text-xs text-blue-200">AI-Powered Learning</p>
              </div>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="text-gray-300 hover:text-white hover:bg-white/10"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Progress Overview */}
        {!collapsed && (
          <div className="p-4 border-b border-gray-700/50">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Overall Progress</span>
                    <span className="text-white font-medium">{Math.round(progressPercentage)}%</span>
                  </div>
                  <Progress 
                    value={progressPercentage} 
                    className="h-2 bg-gray-700"
                  />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/10 rounded p-2 text-center">
                      <div className="text-green-400 font-semibold">{completedLessons.size}</div>
                      <div className="text-gray-300">Completed</div>
                    </div>
                    <div className="bg-white/10 rounded p-2 text-center">
                      <div className="text-blue-400 font-semibold">{totalLessons - completedLessons.size}</div>
                      <div className="text-gray-300">Remaining</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {/* Quick Actions */}
            {!collapsed && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                  Quick Actions
                </h3>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/10"
                    onClick={() => router.push('/courses')}
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Back to Courses
                  </Button>
                </div>
              </div>
            )}

            {/* Course Content */}
            <div className="space-y-2">
              {!collapsed && (
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
                  Course Content
                </h3>
              )}
              
              {chapters.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {!collapsed && (
                    <div>
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Loading course content...</p>
                    </div>
                  )}
                </div>
              ) : (
                chapters.map((chapter, chapterIndex) => (
                  <div key={chapterIndex} className="space-y-1">
                    {/* Chapter Header */}
                    <div className={cn(
                      "px-3 py-2 rounded-lg bg-white/5 border border-white/10",
                      !collapsed && "mb-2"
                    )}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-blue-400 flex-shrink-0" />
                        {!collapsed && (
                          <div>
                            <h4 className="font-medium text-white text-sm">
                              {chapter.chapterTitle}
                            </h4>
                            <p className="text-xs text-gray-400">
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
                          <Tooltip key={subsectionIndex} delayDuration={collapsed ? 0 : 1000}>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleChatClick(subsection.title, subsection.fullText)}
                                className={cn(
                                  "w-full transition-all duration-200 group",
                                  collapsed ? "px-2 py-2" : "px-3 py-2 justify-start",
                                  isSelected 
                                    ? "bg-blue-600 text-white shadow-lg" 
                                    : isCompleted
                                    ? "bg-green-600/20 text-green-100 hover:bg-green-600/30"
                                    : "text-gray-300 hover:text-white hover:bg-white/10"
                                )}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  {isCompleted ? (
                                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                                  ) : isSelected ? (
                                    <PlayCircle className="h-4 w-4 text-white flex-shrink-0" />
                                  ) : (
                                    <div className="h-4 w-4 rounded-full border-2 border-gray-500 flex-shrink-0 group-hover:border-white transition-colors" />
                                  )}
                                  
                                  {!collapsed && (
                                    <div className="flex-1 text-left">
                                      <p className="text-sm font-medium truncate">
                                        {subsection.title}
                                      </p>
                                      {isCompleted && (
                                        <Badge variant="secondary" className="mt-1 bg-green-500/20 text-green-300 text-xs">
                                          Completed
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </Button>
                            </TooltipTrigger>
                            {collapsed && (
                              <TooltipContent side="right" className="max-w-xs">
                                <p className="font-medium">{subsection.title}</p>
                                <p className="text-xs text-gray-400">From: {chapter.chapterTitle}</p>
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
        <div className="border-t border-gray-700/50 p-4 bg-black/20">
          {!collapsed ? (
            <div className="space-y-3">
              {/* User Profile */}
              <div className="flex items-center gap-3">
                <Avatar />
                <div className="flex-1">
                  <p className="font-medium text-white text-sm">Learning Mode</p>
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-purple-400" />
                    <span className="text-xs text-purple-300">AI Enhanced</span>
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
                      className="flex-1 text-gray-300 hover:text-white hover:bg-white/10"
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
                      className="flex-1 text-gray-300 hover:text-white hover:bg-white/10"
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
                      className="flex-1 text-gray-300 hover:text-red-400 hover:bg-red-500/10"
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
                    className="w-full text-gray-300 hover:text-white hover:bg-white/10"
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
                    className="w-full text-gray-300 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign Out</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;
