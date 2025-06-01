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
    const response = await apiClient.get('/api/v2/courses');
    return (response as any).data || (response as any).courses || [];
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
