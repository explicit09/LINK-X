/**
 * Student-specific API facade
 * Backwards compatibility layer
 */

import {
  authAPI,
  courseAPI,
  moduleAPI,
  fileAPI,
  activityAPI,
  todoAPI,
  enrollmentAPI,
  quizAPI,
} from './endpoints';

export const studentAPI = {
  // Profile management
  getProfile: authAPI.v2.getProfile,
  updateProfile: authAPI.v2.updateProfile,

  // Course creation and management
  getCourses: courseAPI.getCourses,
  createCourse: courseAPI.createCourse,
  getCourse: courseAPI.getCourse,
  updateCourse: courseAPI.updateCourse,
  deleteCourse: courseAPI.deleteCourse,

  // Course content upload
  uploadCourseContent: courseAPI.uploadCourseContent,
  uploadCoursePackage: courseAPI.uploadCoursePackage,
  uploadCourseFile: courseAPI.uploadCourseFile,

  // Course modules management
  getCourseModules: moduleAPI.getCourseModules,
  createModule: moduleAPI.createModule,
  getModule: moduleAPI.getModule,
  updateModule: moduleAPI.updateModule,
  deleteModule: moduleAPI.deleteModule,
  getModuleFiles: moduleAPI.getModuleFiles,

  // File operations
  uploadFile: fileAPI.uploadFile,
  getFile: fileAPI.getFile,
  updateFile: fileAPI.updateFile,
  deleteFile: fileAPI.deleteFile,
  downloadFile: fileAPI.downloadFile,
  getFileContent: fileAPI.getFileContent,
  getFileUrl: fileAPI.getFileUrl,

  // Search
  searchFiles: fileAPI.searchFiles,

  // Enrollment
  enrollInCourse: enrollmentAPI.enrollInCourse,
  getEnrollments: enrollmentAPI.getEnrollments,
  unenrollFromCourse: enrollmentAPI.unenrollFromCourse,

  // Discussions and chat
  getCourseDiscussions: courseAPI.getCourseDiscussions,
  postDiscussion: activityAPI.postDiscussion,
  chatWithAI: activityAPI.chatWithAI,

  // Dashboard statistics
  getCourseProgress: courseAPI.getCourseProgress,
  logActivity: activityAPI.logActivity,

  // Dashboard content
  getRecentActivities: activityAPI.getRecentActivities,
  getTodoItems: todoAPI.getTodoItems,
  getDashboardStats: activityAPI.getDashboardStats,
  createTodoItem: todoAPI.createTodoItem,
  updateTodoItem: todoAPI.updateTodoItem,
  deleteTodoItem: todoAPI.deleteTodoItem,

  // Quizzes
  getCourseQuizzes: quizAPI.getCourseQuizzes,
  generateCourseQuiz: quizAPI.generateCourseQuiz,
  getQuiz: quizAPI.getQuiz,
  startQuizSession: quizAPI.startQuizSession,
  submitQuizAnswer: quizAPI.submitQuizAnswer,
  submitQuiz: quizAPI.submitQuiz,
  getQuizResults: quizAPI.getQuizResults,
};