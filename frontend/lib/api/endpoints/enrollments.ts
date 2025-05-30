/**
 * Enrollment-related endpoint handlers
 */

import { apiClient } from '../client';

export const enrollmentAPI = {
  // Student enrollment
  enrollInCourse: (accessCode: string) => 
    apiClient.post('/api/v2/enrollments', { accessCode }),

  getEnrollments: () => 
    apiClient.get('/api/v2/enrollments'),

  unenrollFromCourse: (enrollmentId: string) => 
    apiClient.delete(`/api/v2/enrollments/${enrollmentId}`),

  // Instructor enrollment management
  unenrollStudent: (enrollmentId: string) => 
    apiClient.delete(`/api/v2/enrollments/${enrollmentId}`),
};