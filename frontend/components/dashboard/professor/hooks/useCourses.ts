import { useState, useEffect } from 'react';
import { instructorAPI } from '@/lib/api';
import { toast } from 'sonner';

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
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch courses
  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await instructorAPI.getCourses();
      
      // Ensure response is an array before setting courses
      if (!Array.isArray(response)) {
        console.warn('Courses response is not an array:', response);
        setCourses([]);
        return;
      }
      
      setCourses(response);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to load courses');
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  // Create course
  const createCourse = async (
    courseData: CreateCourseData,
  ): Promise<Course | null> => {
    try {
      const newCourse = await instructorAPI.createCourse(courseData);
      setCourses((prev) => [...prev, newCourse]);
      toast.success('Course created successfully');
      return newCourse;
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
      const updatedCourse = await instructorAPI.updateCourse(
        courseId,
        updateData,
      );
      setCourses((prev) =>
        prev.map((course) =>
          course.id === courseId ? { ...course, ...updatedCourse } : course,
        ),
      );
      toast.success('Course updated successfully');
      return updatedCourse;
    } catch (err) {
      console.error('Error updating course:', err);
      toast.error('Failed to update course');
      return null;
    }
  };

  // Delete course
  const deleteCourse = async (courseId: string): Promise<boolean> => {
    try {
      await instructorAPI.deleteCourse(courseId);
      setCourses((prev) => prev.filter((course) => course.id !== courseId));
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

  // Initial load
  useEffect(() => {
    fetchCourses();
  }, []);

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
    refetch: fetchCourses,
  };
}
