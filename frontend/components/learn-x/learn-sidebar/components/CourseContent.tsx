import React from 'react';
import { BookOpen, CheckCircle, PlayCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Chapter } from '../types';

interface CourseContentProps {
  chapters: Chapter[];
  collapsed: boolean;
  selectedLesson: string | null;
  completedLessons: Set<string>;
  onLessonClick: (title: string, fullText: string) => void;
}

export const CourseContent: React.FC<CourseContentProps> = ({
  chapters,
  collapsed,
  selectedLesson,
  completedLessons,
  onLessonClick
}) => {
  if (chapters.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        {!collapsed && (
          <div>
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Loading course content...</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {chapters.map((chapter, chapterIndex) => (
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
                      onClick={() => onLessonClick(subsection.title, subsection.fullText)}
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
      ))}
    </>
  );
};