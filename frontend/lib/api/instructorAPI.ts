/**
 * Instructor-specific API facade
 * Backwards compatibility layer
 */

import {
  authAPI,
  courseAPI,
  moduleAPI,
  fileAPI,
  enrollmentAPI,
} from './endpoints';

export const instructorAPI = {
  // Profile management
  getProfile: authAPI.v2.getProfile,
  createProfile: authAPI.v2.createProfile,
  updateProfile: authAPI.v2.updateProfile,
  deleteProfile: authAPI.v2.deleteProfile,

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
