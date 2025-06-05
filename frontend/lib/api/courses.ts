import { apiClient } from './client';

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  creator_id?: string;  // Added to track who created the course
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
  materials?: FileInfo[];
}

export interface FileInfo {
  id: string;
  module_id: string;
  title: string;
  filename: string;
  file_type: string;
  file_size: number;
  processed?: boolean;
  created_at: string;
  view_count_raw?: number;
  view_count_personalized?: number;
  chat_count?: number;
  s3_key?: string;
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

export interface ResumeTarget {
  type: 'file' | 'module';
  module_id: string;
  module_title: string;
  file_id: string | null;
  file_title: string | null;
  file_type: string | null;
  progress_percent: number;
  reason: 'partially_completed' | 'not_started' | 'start_course';
  estimated_time_remaining: string;
  last_accessed: string | null;
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
    try {
      const modules = await apiClient.get<Module[]>(`/api/v2/courses/${courseId}/modules`);
      return modules || [];
    } catch (error) {
      console.warn('Failed to fetch modules, returning empty array:', error);
      return [];
    }
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

  // Join course by access code (without knowing courseId)
  async joinCourseByCode(accessCode: string): Promise<Course> {
    return apiClient.post<Course>('/api/v2/courses/join', {
      access_code: accessCode,
    });
  }

  // Statistics
  async getCourseStats(courseId: string): Promise<any> {
    return apiClient.get(`/api/v2/courses/${courseId}/stats`);
  }

  // Progress
  async getCourseProgress(courseId: string): Promise<{
    course_id: string;
    user_id: string;
    completion_percentage: number;
    modules_completed: number;
    total_modules: number;
    last_accessed: string | null;
  }> {
    return apiClient.get(`/api/v2/courses/${courseId}/progress`);
  }

  // Resume target
  async getResumeTarget(courseId: string): Promise<ResumeTarget> {
    return apiClient.get<ResumeTarget>(`/api/v2/courses/${courseId}/resume`);
  }

  // Role-based course retrieval
  async getStudentCourses(): Promise<Course[]> {
    // Use the main courses endpoint - it automatically filters by user role
    // Students will only see courses they're enrolled in
    return this.getCourses();
  }

  async getInstructorCourses(): Promise<Course[]> {
    // Use the main courses endpoint - it automatically filters by user role
    // Instructors will only see courses they teach
    return this.getCourses();
  }
}

export const courseAPI = new CourseAPI();
