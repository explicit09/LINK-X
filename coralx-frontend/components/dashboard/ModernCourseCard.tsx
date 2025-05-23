"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Upload,
  Brain,
  MessageSquare,
  Users,
  FileText,
  Clock,
  MoreVertical,
  BookOpen,
  TrendingUp,
  Zap,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  title: string;
  code: string;
  term?: string;
  description?: string;
  published?: boolean;
  color?: string;
  lastActivity?: string;
  unreadCount?: number;
  materialsCount?: number;
  studentsCount?: number;
}

interface ModernCourseCardProps {
  course: Course;
  colorIndex?: number;
  onClick?: (course: Course) => void;
  onUpload?: (courseId: string) => void;
  onAIChat?: (courseId: string) => void;
  onQuiz?: (courseId: string) => void;
}

const courseColors = [
  {
    name: "electric-blue",
    gradient: "from-blue-500 via-purple-500 to-indigo-600",
    accent: "blue-600",
    text: "blue-700",
    bg: "blue-50",
    border: "blue-300",
    glow: "blue-400"
  },
  {
    name: "vibrant-green", 
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
    accent: "emerald-600",
    text: "emerald-700",
    bg: "emerald-50",
    border: "emerald-300",
    glow: "emerald-400"
  },
  {
    name: "sunset-purple",
    gradient: "from-purple-500 via-pink-500 to-rose-600",
    accent: "purple-600", 
    text: "purple-700",
    bg: "purple-50",
    border: "purple-300",
    glow: "purple-400"
  },
  {
    name: "coral-orange",
    gradient: "from-orange-500 via-red-500 to-pink-600",
    accent: "orange-600",
    text: "orange-700", 
    bg: "orange-50",
    border: "orange-300",
    glow: "orange-400"
  },
  {
    name: "ruby-red",
    gradient: "from-red-500 via-pink-500 to-purple-600",
    accent: "red-600",
    text: "red-700",
    bg: "red-50", 
    border: "red-300",
    glow: "red-400"
  },
  {
    name: "ocean-teal",
    gradient: "from-teal-500 via-cyan-500 to-blue-600",
    accent: "teal-600",
    text: "teal-700",
    bg: "teal-50",
    border: "teal-300",
    glow: "teal-400"
  },
  {
    name: "golden-yellow",
    gradient: "from-yellow-500 via-orange-500 to-red-500",
    accent: "yellow-600",
    text: "yellow-700",
    bg: "yellow-50",
    border: "yellow-300",
    glow: "yellow-400"
  },
  {
    name: "royal-indigo",
    gradient: "from-indigo-500 via-purple-500 to-blue-600", 
    accent: "indigo-600",
    text: "indigo-700",
    bg: "indigo-50",
    border: "indigo-300",
    glow: "indigo-400"
  }
];

export function ModernCourseCard({ 
  course, 
  colorIndex = 0, 
  onClick, 
  onUpload, 
  onAIChat, 
  onQuiz 
}: ModernCourseCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Get color scheme for this course
  const colors = courseColors[colorIndex % courseColors.length];
  
  const handleCardClick = () => {
    onClick?.(course);
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden cursor-pointer group",
        "bg-white border-2 transition-all duration-300 ease-out",
        "hover:shadow-2xl hover:scale-[1.02]",
        "gradient-hover modern-hover",
        isHovered ? `border-${colors.border}` : "border-gray-200"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Course Color Bar - Now flat but vibrant */}
      <div className={cn(
        "h-1 w-full transition-all duration-500",
        `bg-${colors.accent}`,
        isHovered ? "h-2" : "h-1"
      )} />
      
      <CardContent className="p-6 relative">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className={cn(
                "font-bold text-lg canvas-text transition-colors duration-300",
                isHovered ? `text-${colors.text}` : "text-gray-900"
              )}>
                {course.title}
              </h3>
              {course.unreadCount && course.unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="h-5 w-5 text-xs p-0 flex items-center justify-center animate-pulse"
                >
                  {course.unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="font-medium">{course.code}</span>
              <span>•</span>
              <span>{course.term}</span>
            </div>
          </div>
          
          {/* Actions Dropdown - Cleaner approach */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-300",
                  "hover:bg-gray-100 data-[state=open]:opacity-100"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={(e) => handleActionClick(e, () => onUpload?.(course.id))}
                className="cursor-pointer"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Material
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => handleActionClick(e, () => onAIChat?.(course.id))}
                className="cursor-pointer"
              >
                <Brain className="h-4 w-4 mr-2" />
                Ask AI Tutor
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => handleActionClick(e, () => onQuiz?.(course.id))}
                className="cursor-pointer"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Generate Quiz
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Course Description */}
        <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
          {course.description}
        </p>

        {/* Stats Section with improved spacing */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Users className="h-3.5 w-3.5" />
            <span>{course.studentsCount || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <FileText className="h-3.5 w-3.5" />
            <span>{course.materialsCount || 0} materials</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            <span>{course.lastActivity || "No recent activity"}</span>
          </div>
        </div>

        {/* Single Call-to-Action Button */}
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            className={cn(
              "transition-all duration-300 font-medium",
              `bg-${colors.accent} hover:bg-${colors.text}`,
              "shadow-sm hover:shadow-md transform hover:scale-105"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(course);
            }}
          >
            <Play className="h-3.5 w-3.5 mr-2" />
            Continue Learning
          </Button>
          
          {/* Quick AI Button */}
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "transition-all duration-300 opacity-0 group-hover:opacity-100",
              `hover:bg-${colors.bg} hover:border-${colors.border} hover:text-${colors.text}`,
              "transform hover:scale-105"
            )}
            onClick={(e) => handleActionClick(e, () => onAIChat?.(course.id))}
          >
            <Brain className="h-3.5 w-3.5 mr-1" />
            Ask AI
          </Button>
        </div>

        {/* Progress Indicator (Hidden until hover) */}
        <div className={cn(
          "mt-4 transition-all duration-500 overflow-hidden",
          isHovered ? "max-h-16 opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Course Progress</span>
            <span>73%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-1000 ease-out",
                `bg-${colors.accent}`,
                isHovered ? "w-[73%]" : "w-0"
              )}
            />
          </div>
        </div>

        {/* Floating Course Icon (Subtle) */}
        <div className={cn(
          "absolute top-4 right-12 transition-all duration-300",
          isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
        )}>
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center",
            `bg-${colors.bg} border border-${colors.border}`
          )}>
            <BookOpen className={cn("h-3 w-3", `text-${colors.text}`)} />
          </div>
        </div>

        {/* Subtle Shine Effect */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent",
          "opacity-0 transition-all duration-700 pointer-events-none",
          "transform -translate-x-full",
          isHovered ? "opacity-10 translate-x-full" : "opacity-0 -translate-x-full"
        )} />
      </CardContent>
    </Card>
  );
} 