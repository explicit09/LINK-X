/**
 * Course-related endpoint handlers
 */

import { apiClient } from '../client';
import type {
  Course,
  CreateCourseRequest,
  UpdateCourseRequest,
} from '../../../types/api';

export const courseAPI = {
  // Common course operations
  getCourses: async (): Promise<Course[]> => {
    try {
      console.log('🔍 getCourses: Making API call to /api/v2/courses');
      const result = await apiClient.get('/api/v2/courses');
      console.log('📋 getCourses: Raw API response:', result);
      console.log('📊 getCourses: Response type:', typeof result);
      console.log('📈 getCourses: Is array:', Array.isArray(result));
      
      // Ensure we always return an array for courses
      if (!Array.isArray(result)) {
        console.warn('⚠️ getCourses: API returned non-array result:', result);
        return [];
      }
      
      console.log('✅ getCourses: Returning', result.length, 'courses');
      return result;
    } catch (error) {
      console.error('❌ getCourses: API call failed:', error);
      console.error('❌ getCourses: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: (error as any)?.status,
        data: (error as any)?.data
      });
      
      // For debugging: return mock data if API fails
      console.log('🧪 getCourses: Returning mock data for debugging');
      return [
        {
          id: 'mock-1',
          title: 'Mock Course 1 (API Failed)',
          description: 'This is mock data because the API call failed',
          code: 'MOCK101',
          term: 'Debug Term',
          published: true,
          creator_id: 'mock-creator',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    }
  },

  createCourse: (data: CreateCourseRequest): Promise<Course> =>
    apiClient.post('/api/v2/courses', data),

  getCourse: (courseId: string): Promise<Course> =>
    apiClient.get(`/api/v2/courses/${courseId}`),

  updateCourse: (
    courseId: string,
    data: UpdateCourseRequest,
  ): Promise<Course> => apiClient.patch(`/api/v2/courses/${courseId}`, data),

  deleteCourse: (courseId: string) =>
    apiClient.delete(`/api/v2/courses/${courseId}`),

  // Course search and utilities
  search: (courseId: string, query: string) =>
    apiClient.post(`/courses/${courseId}/search`, { query }),

  getCitations: (courseId: string) =>
    apiClient.get(`/courses/${courseId}/citations`),

  getCourseProgress: (courseId: string) =>
    apiClient.get(`/api/v2/courses/${courseId}/progress`),

  getCourseStudents: (courseId: string) =>
    apiClient.get(`/api/v2/courses/${courseId}/students`),

  getCourseDiscussions: (courseId: string) =>
    apiClient.get(`/api/v2/courses/${courseId}/discussions`),

  getCourseQuizzes: (courseId: string) =>
    apiClient.get(`/api/v2/courses/${courseId}/quizzes`),

  // Course content management
  uploadCourseContent: (courseId: string, data: FormData) => {
    return apiClient.post(`/api/v2/courses/${courseId}/upload-content`, data);
  },

  uploadCoursePackage: (data: FormData) => {
    return apiClient.post(`/api/v2/courses/upload-package`, data);
  },

  // Legacy endpoints
  uploadCourseFile: (courseId: string, formData: FormData) => {
    return apiClient.post(`/student/courses/${courseId}/files`, formData);
  },

  // Reports (instructor-specific)
  getCourseReport: (courseId: string) =>
    apiClient.get(`/instructor/courses/${courseId}/reports`),

  generateCourseReport: (courseId: string) =>
    apiClient.post(`/instructor/courses/${courseId}/reports`),

  generateCourseFAQs: (courseId: string) =>
    apiClient.post(`/instructor/courses/${courseId}/faqs`),

  // Student enrollment via access code
  joinCourseByCode: (accessCode: string): Promise<Course> =>
    apiClient.post('/api/v2/courses/join', { access_code: accessCode }),

  // Leave a course (for students)
  leaveCourse: (courseId: string) =>
    apiClient.delete(`/api/v2/courses/${courseId}/leave`),
};
