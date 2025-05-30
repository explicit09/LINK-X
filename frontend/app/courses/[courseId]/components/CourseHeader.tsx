'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Course, CourseProgress } from '../types/course.types';
import { getCourseColor } from '../utils/courseHelpers';

interface CourseHeaderProps {
  course: Course;
  courseProgress: CourseProgress;
  totalMaterials: number;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  onDeleteCourse?: () => void;
  isInstructor?: boolean;
}

export const CourseHeader = ({
  course,
  courseProgress,
  totalMaterials,
  isFocusMode,
  onToggleFocusMode,
  onDeleteCourse,
  isInstructor = false
}: CourseHeaderProps) => {
  const router = useRouter();
  const colors = getCourseColor(course.id);

  return (
    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg px-3 py-2 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <div className="flex items-center gap-3">
              <div className={cn("w-3 h-8 rounded-full bg-gradient-to-b", colors.gradient)} />
              <div>
                <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
                  {course.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                  <span>{course.code} • {course.term}</span>
                  <span>•</span>
                  <span>{totalMaterials} material{totalMaterials !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <span>{courseProgress.progressPercentage}% complete</span>
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 transition-all duration-300"
                        style={{ width: `${courseProgress.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                  <span>•</span>
                  <span>{Math.round(courseProgress.todayTimeMinutes)}m today</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
              onClick={onToggleFocusMode}
            >
              {isFocusMode ? 'Exit Focus' : 'Focus Mode'}
            </Button>
            {isInstructor && onDeleteCourse && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={onDeleteCourse}
              >
                Delete Course
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};