/**
 * Instructor-specific API facade
 * Backwards compatibility layer
 */

import {
  courseAPI,
  moduleAPI,
  fileAPI,
  enrollmentAPI,
} from './endpoints';

export const instructorAPI = {
  // Profile management (mocked for no-auth)
  getProfile: async () => ({ data: { role: 'instructor', email: 'instructor@example.com' } }),
  createProfile: async () => ({ data: { role: 'instructor' } }),
  updateProfile: async () => ({ data: { role: 'instructor' } }),
  deleteProfile: async () => ({ success: true }),

  // Courses
  getCourses: courseAPI.getCourses,
  createCourse: courseAPI.createCourse,
  getCourse: courseAPI.getCourse,
  updateCourse: courseAPI.updateCourse,
  deleteCourse: courseAPI.deleteCourse,

  // Course management
  getCourseStudents: courseAPI.getCourseStudents,
  unenrollStudent: enrollmentAPI.unenrollStudent,

  // Modules
  getCourseModules: moduleAPI.getCourseModules,
  createModule: moduleAPI.createModule,
  updateModule: (courseId: string, moduleId: string, data: any) =>
    moduleAPI.updateModule(moduleId, data),
  deleteModule: moduleAPI.deleteModule,

  // Files
  getModuleFiles: moduleAPI.getModuleFiles,
  uploadFile: fileAPI.uploadFile,
  getFile: fileAPI.getFile,
  updateFile: fileAPI.updateFile,
  deleteFile: fileAPI.deleteFile,
  getFileContent: fileAPI.getFileContent,
  downloadFile: fileAPI.downloadFile,
  getFileUrl: fileAPI.getFileUrl,

  // Reports
  getCourseReport: courseAPI.getCourseReport,
  generateCourseReport: courseAPI.generateCourseReport,
  generateCourseFAQs: courseAPI.generateCourseFAQs,
};
