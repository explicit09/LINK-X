/**
 * Quiz-related endpoint handlers
 */

import { apiClient } from '../client';
import type {
  GenerateQuizRequest,
  SubmitQuizAnswerRequest,
} from '../../../types/api';

export const quizAPI = {
  // Course quizzes
  getCourseQuizzes: (courseId: string) => 
    apiClient.get(`/api/v2/courses/${courseId}/quizzes`),

  generateCourseQuiz: (courseId: string, options?: GenerateQuizRequest) => 
    apiClient.post(`/api/v2/courses/${courseId}/quizzes/generate`, options),

  // Quiz operations
  getQuiz: (quizId: string) => 
    apiClient.get(`/api/v2/quizzes/${quizId}`),

  startQuizSession: (quizId: string) => 
    apiClient.post(`/api/v2/quizzes/${quizId}/start`),

  submitQuizAnswer: (quizId: string, questionId: string, answer: string) => 
    apiClient.post(`/api/v2/quizzes/${quizId}/questions/${questionId}/answer`, { answer }),

  submitQuiz: (quizId: string) => 
    apiClient.post(`/api/v2/quizzes/${quizId}/submit`),

  getQuizResults: (quizId: string) => 
    apiClient.get(`/api/v2/quizzes/${quizId}/results`),
};