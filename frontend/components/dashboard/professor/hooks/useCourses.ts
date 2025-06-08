import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useCourses as useSupabaseCourses } from '@/lib/hooks/useDatabase';
import { courseOperations } from '@/lib/db/operations';

export interface Course {
  id: string;
  title: string;
  description?: string;
  code: string;
  term: string;
  published: boolean;
  lastUpdated: string;
  accessCode: string;
  students: number;
}

export interface CreateCourseData {
  title: string;
  description?: string;
  code: string;
  term: string;
}

export interface UpdateCourseData {
  title?: string;
  description?: string;
  code?: string;
  term?: string;
  published?: boolean;
}

export function useCourses() {
  // ✅ NEW: Use Supabase hooks instead of API calls
  const { 
    courses: supabaseCourses, 
    loading, 
    error, 
    createCourse: createCourseFromHook,
    updateCourse: updateCourseFromHook,
    deleteCourse: deleteCourseFromHook,
    refetch
  } = useSupabaseCourses();

  // Transform Supabase courses to match professor interface
  const courses: Course[] = supabaseCourses.map(course => ({
    id: course.id,
    title: course.title,
    description: course.description,
    code: course.code || '',
    term: course.term || 'Current',
    published: course.published,
    lastUpdated: course.updated_at || new Date().toISOString(),
    accessCode: 'TEMP123', // TODO: Get from access_codes table
    students: 0, // TODO: Get from enrollments count
  }));

  // Create course
  const createCourse = async (
    courseData: CreateCourseData,
  ): Promise<Course | null> => {
    try {
      const newCourse = await createCourseFromHook({
        ...courseData,
        published: false, // Default to unpublished for professors
      });

      toast.success('Course created successfully');
      
      // Transform to professor interface
      return {
        id: newCourse.id,
        title: newCourse.title,
        description: newCourse.description,
        code: newCourse.code || '',
        term: newCourse.term || 'Current',
        published: newCourse.published,
        lastUpdated: newCourse.updated_at || new Date().toISOString(),
        accessCode: 'TEMP123',
        students: 0,
      };
    } catch (err) {
      console.error('Error creating course:', err);
      toast.error('Failed to create course');
      return null;
    }
  };

  // Update course
  const updateCourse = async (
    courseId: string,
    updateData: UpdateCourseData,
  ): Promise<Course | null> => {
    try {
      const updatedCourse = await updateCourseFromHook(courseId, updateData);
      toast.success('Course updated successfully');
      
      // Transform to professor interface
      return {
        id: updatedCourse.id,
        title: updatedCourse.title,
        description: updatedCourse.description,
        code: updatedCourse.code || '',
        term: updatedCourse.term || 'Current',
        published: updatedCourse.published,
        lastUpdated: updatedCourse.updated_at || new Date().toISOString(),
        accessCode: 'TEMP123',
        students: 0,
      };
    } catch (err) {
      console.error('Error updating course:', err);
      toast.error('Failed to update course');
      return null;
    }
  };

  // Delete course
  const deleteCourse = async (courseId: string): Promise<boolean> => {
    try {
      await deleteCourseFromHook(courseId);
      toast.success('Course deleted successfully');
      return true;
    } catch (err) {
      console.error('Error deleting course:', err);
      toast.error('Failed to delete course');
      return false;
    }
  };

  // Toggle course publish status
  const togglePublish = async (courseId: string): Promise<boolean> => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return false;

    const success = await updateCourse(courseId, {
      published: !course.published,
    });
    return !!success;
  };

  // Filter courses by status
  const getPublishedCourses = () =>
    courses.filter((course) => course.published);
  const getUnpublishedCourses = () =>
    courses.filter((course) => !course.published);

  // Search courses
  const searchCourses = (query: string) => {
    if (!query.trim()) return courses;

    const lowercaseQuery = query.toLowerCase();
    return courses.filter(
      (course) =>
        course.title.toLowerCase().includes(lowercaseQuery) ||
        course.code.toLowerCase().includes(lowercaseQuery) ||
        course.description?.toLowerCase().includes(lowercaseQuery),
    );
  };

  return {
    courses,
    loading,
    error,
    createCourse,
    updateCourse,
    deleteCourse,
    togglePublish,
    getPublishedCourses,
    getUnpublishedCourses,
    searchCourses,
    refetch,
  };
}
