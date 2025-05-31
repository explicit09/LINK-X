"use client";

import React from "react";
import { ChevronRight, MoreHorizontal, Brain, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CourseItem {
  id: string;
  code: string;
  title: string;
  progress: number;
  progressColor: string;
  deadline?: string;
  timeLeft?: string;
  status?: "assignment" | "project" | "quiz" | "final";
}

interface ModernCoursesSectionProps {
  courses?: CourseItem[];
  onCourseClick?: (course: CourseItem) => void;
  onViewAll?: () => void;
}

const defaultCourses: CourseItem[] = [
  {
    id: "1",
    code: "CS229",
    title: "Machine Learning",
    progress: 85,
    progressColor: "bg-red-500",
    deadline: "Assignment • Today",
    status: "assignment"
  },
  {
    id: "2",
    code: "CS231n",
    title: "Computer Vision",
    progress: 45,
    progressColor: "bg-gray-400",
    deadline: "Quiz • 3 days",
    status: "quiz"
  },
  {
    id: "3",
    code: "CS224n",
    title: "Natural Language Processing",
    progress: 75,
    progressColor: "bg-orange-500",
    deadline: "Project • 5 days",
    status: "project"
  },
  {
    id: "4",
    code: "CS161",
    title: "Algorithms",
    progress: 90,
    progressColor: "bg-green-500",
    deadline: "Final • 2 weeks",
    status: "final"
  },
  {
    id: "5",
    code: "CS106B",
    title: "Programming Abstractions",
    progress: 20,
    progressColor: "bg-gray-300",
    deadline: "",
    status: "assignment"
  },
  {
    id: "6",
    code: "CS103",
    title: "Mathematical Foundations",
    progress: 60,
    progressColor: "bg-blue-500",
    deadline: "",
    status: "project"
  }
];

export function ModernCoursesSection({ 
  courses = defaultCourses, 
  onCourseClick,
  onViewAll 
}: ModernCoursesSectionProps) {
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "assignment":
        return "📄";
      case "project":
        return "🔧";
      case "quiz":
        return "📝";
      case "final":
        return "🎯";
      default:
        return "📚";
    }
  };

  const getAIInsight = (course: CourseItem) => {
    if (course.progress >= 90) {
      return {
        icon: <TrendingUp className="h-3 w-3 text-green-600" />,
        title: "Excellent Progress!",
        message: `Score improved +15% from last review. Keep momentum with advanced topics.`,
        color: "text-green-600"
      };
    }
    if (course.progress <= 30) {
      return {
        icon: <AlertTriangle className="h-3 w-3 text-orange-600" />,
        title: "Needs Attention",
        message: `Based on your struggles: Try the visual tutorial first, then practice problems.`,
        color: "text-orange-600"
      };
    }
    return {
      icon: <Brain className="h-3 w-3 text-blue-600" />,
      title: "AI Recommendation",
      message: `Next suggested topic: ${course.code === 'CS229' ? 'Backpropagation' : course.code === 'CS224n' ? 'Attention Mechanisms' : 'Feature Detection'}`,
      color: "text-blue-600"
    };
  };

  return (
    <TooltipProvider>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">All Courses</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onViewAll}
            className="text-gray-500 hover:text-gray-700"
          >
            View all
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {courses.map((course) => {
          const getUrgencyBadge = () => {
            if (course.deadline?.includes("Today")) {
              return { text: "Due Today", color: "bg-red-100 text-red-700", priority: "urgent" };
            }
            if (course.deadline?.includes("3 days")) {
              return { text: "3 Days Left", color: "bg-orange-100 text-orange-700", priority: "warning" };
            }
            if (course.deadline?.includes("5 days")) {
              return { text: "5 Days Left", color: "bg-yellow-100 text-yellow-700", priority: "normal" };
            }
            if (course.progress >= 80) {
              return { text: "On Track", color: "bg-green-100 text-green-700", priority: "good" };
            }
            return null;
          };

          const urgencyBadge = getUrgencyBadge();
          const cardBorderColor = urgencyBadge?.priority === 'urgent' ? 'border-red-200' : 
                                 urgencyBadge?.priority === 'warning' ? 'border-orange-200' : 
                                 'border-gray-200';
          const aiInsight = getAIInsight(course);
          
          return (
            <div
              key={course.id}
              onClick={() => onCourseClick?.(course)}
              className={`bg-white rounded-lg border ${cardBorderColor} p-4 hover:shadow-md transition-all duration-200 cursor-pointer h-full min-h-[140px] flex flex-col justify-between`}
            >
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    {urgencyBadge && (
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-2 ${urgencyBadge.color}`}>
                        {urgencyBadge.text}
                      </div>
                    )}
                    <h3 className="font-medium text-gray-900 text-sm mb-1">
                      {course.code}
                    </h3>
                    <p className="text-xs text-gray-600 mb-2">{course.title}</p>
                    
                    {course.deadline && (
                      <div className="flex items-center text-xs text-gray-500 mb-2">
                        <span className="mr-1">{getStatusIcon(course.status)}</span>
                        {course.deadline}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-1 hover:bg-gray-100 rounded cursor-pointer">
                          {aiInsight.icon}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <div className="space-y-1">
                          <p className={`font-medium text-xs ${aiInsight.color}`}>
                            {aiInsight.title}
                          </p>
                          <p className="text-xs text-gray-600">
                            {aiInsight.message}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <ChevronRight className="h-3 w-3 text-gray-400" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Progress section */}
              <div className="space-y-2 mt-auto">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Progress</span>
                  <span className="text-gray-500">{course.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${course.progressColor}`}
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </TooltipProvider>
  );
}