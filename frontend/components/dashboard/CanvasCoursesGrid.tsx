'use client';

import React from 'react';
import { CanvasCourseCard } from './cards/CanvasCourseCard';
import { Skeleton } from '@/components/ui/skeleton';

interface Course {
  id: string;
  title: string;
  code?: string;
  description?: string;
  category?: string;
  instructor: {
    id: string;
    name: string;
  };
  stats?: {
    materials: number;
    modules: number;
    students: number;
  };
  term?: string;
  credits?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

interface CanvasCoursesGridProps {
  courses: Course[];
  loading?: boolean;
  emptyMessage?: string;
}

export function CanvasCoursesGrid({ 
  courses, 
  loading = false,
  emptyMessage = "No courses found"
}: CanvasCoursesGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-36 w-full rounded-t-lg" />
            <div className="px-4 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {courses.map((course) => (
        <CanvasCourseCard
          key={course.id}
          course={{
            id: course.id,
            title: course.title,
            code: course.code || `COURSE-${course.id}`,
            instructor: course.instructor?.name || 'Unknown Instructor',
            term: course.term || 'Fall 2024',
            credits: course.credits || 3,
            enrolledCount: course.stats?.students,
            materialsCount: course.stats?.materials,
          }}
        />
      ))}
    </div>
  );
}