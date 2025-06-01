import { apiClient } from './client';

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  category?: string;
  tags?: string[];
  published: boolean;
  created_at: string;
  updated_at: string;
  modules?: Module[];
  instructor?: {
    name: string;
    email: string;
  };
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  ordering: number;
  created_at: string;
  files?: FileInfo[];
}

export interface FileInfo {
  id: string;
  module_id: string;
  title: string;
  filename: string;
  file_type: string;
  file_size: number;
  processed: boolean;
  created_at: string;
}

export interface CreateCourseData {
  title: string;
  description: string;
  category?: string;
  tags?: string[];
}

export interface AccessCode {
  code: string;
  course_id: string;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
}

class CourseAPI {
  // Course CRUD
  async getCourses(): Promise<Course[]> {
    return apiClient.get<Course[]>('/api/v2/courses');
  }

  async getCourse(courseId: string): Promise<Course> {
    return apiClient.get<Course>(`/api/v2/courses/${courseId}`);
  }

  async createCourse(data: CreateCourseData): Promise<Course> {
    return apiClient.post<Course>('/api/v2/courses', data);
  }

  async updateCourse(
    courseId: string,
    data: Partial<CreateCourseData>,
  ): Promise<Course> {
    return apiClient.patch<Course>(`/api/v2/courses/${courseId}`, data);
  }

  async deleteCourse(courseId: string): Promise<void> {
    await apiClient.delete(`/api/v2/courses/${courseId}`);
  }

  async publishCourse(courseId: string): Promise<Course> {
    return apiClient.post<Course>(`/api/v2/courses/${courseId}/publish`);
  }

  // Modules
  async getCourseModules(courseId: string): Promise<Module[]> {
    return apiClient.get<Module[]>(`/api/v2/courses/${courseId}/modules`);
  }

  async createModule(
    courseId: string,
    data: { title: string; description?: string },
  ): Promise<Module> {
    return apiClient.post<Module>(`/api/v2/courses/${courseId}/modules`, data);
  }

  async updateModule(
    moduleId: string,
    data: { title?: string; description?: string },
  ): Promise<Module> {
    return apiClient.patch<Module>(`/api/v2/modules/${moduleId}`, data);
  }

  async deleteModule(moduleId: string): Promise<void> {
    await apiClient.delete(`/api/v2/modules/${moduleId}`);
  }

  // Enrollment
  async enrollInCourse(
    courseId: string,
    accessCode: string,
  ): Promise<Enrollment> {
    return apiClient.post<Enrollment>(`/api/v2/courses/${courseId}/enroll`, {
      accessCode,
    });
  }

  // Statistics
  async getCourseStats(courseId: string): Promise<any> {
    return apiClient.get(`/api/v2/courses/${courseId}/stats`);
  }

  // Legacy endpoints for compatibility
  async getStudentCourses(): Promise<Course[]> {
    return apiClient.get<Course[]>('/student/courses');
  }

  async getInstructorCourses(): Promise<Course[]> {
    return apiClient.get<Course[]>('/instructor/courses');
  }
}

export const courseAPI = new CourseAPI();
