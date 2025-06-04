import { AuthAPIClient } from './auth-client';
import type { RequestConfig } from './base-client';

export interface Course {
  id: string;
  title: string;
  code: string;
  term?: string;
  description?: string;
  published?: boolean;
  instructor?: string;
  students?: number;
  modules?: any[];
  last_updated?: string;
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  course_id: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Material {
  id: string;
  title: string;
  file_path: string;
  file_type: string;
  module_id: string;
  uploaded_at?: string;
}

/**
 * CourseAPIClient - Handles course-related API operations
 * PRESERVE exact API patterns from working components
 */
export class CourseAPIClient extends AuthAPIClient {
  
  // Course management
  async getCourses(): Promise<Course[]> {
    const response = await this.authenticatedGet<any>('/api/v2/courses');
    return response.data || response; // Handle wrapped responses
  }

  async getCourse(courseId: string): Promise<Course> {
    const response = await this.authenticatedGet<any>(`/api/v2/courses/${courseId}`);
    return response.data || response;
  }

  async createCourse(courseData: Partial<Course>): Promise<Course> {
    const response = await this.authenticatedPost<any>('/api/v2/courses', courseData);
    return response.data || response;
  }

  async updateCourse(courseId: string, updates: Partial<Course>): Promise<Course> {
    const response = await this.authenticatedPatch<any>(`/api/v2/courses/${courseId}`, updates);
    return response.data || response;
  }

  async deleteCourse(courseId: string): Promise<void> {
    await this.authenticatedDelete(`/api/v2/courses/${courseId}`);
  }

  async joinCourse(accessCode: string): Promise<Course> {
    const response = await this.authenticatedPost<any>('/api/v2/courses/join', { 
      access_code: accessCode 
    });
    return response.data || response;
  }

  async leaveCourse(courseId: string): Promise<void> {
    await this.authenticatedDelete(`/api/v2/courses/${courseId}/leave`);
  }

  // Module management
  async getModules(courseId: string): Promise<Module[]> {
    const response = await this.authenticatedGet<any>(`/api/v2/courses/${courseId}/modules`);
    return response.data || response;
  }

  async createModule(courseId: string, moduleData: Partial<Module>): Promise<Module> {
    const response = await this.authenticatedPost<any>(
      `/api/v2/courses/${courseId}/modules`, 
      moduleData
    );
    return response.data || response;
  }

  async updateModule(moduleId: string, updates: Partial<Module>): Promise<Module> {
    const response = await this.authenticatedPatch<any>(`/api/v2/modules/${moduleId}`, updates);
    return response.data || response;
  }

  async deleteModule(moduleId: string): Promise<void> {
    await this.authenticatedDelete(`/api/v2/modules/${moduleId}`);
  }

  // File/Material management
  async uploadFile(courseId: string, moduleId: string, file: File): Promise<Material> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('module_id', moduleId);

    const response = await this.authenticatedPost<any>(
      `/api/v2/courses/${courseId}/upload-content`,
      formData
    );
    return response.data || response;
  }

  async getMaterials(moduleId: string): Promise<Material[]> {
    const response = await this.authenticatedGet<any>(`/api/v2/modules/${moduleId}/materials`);
    return response.data || response;
  }

  async deleteMaterial(materialId: string): Promise<void> {
    await this.authenticatedDelete(`/api/v2/materials/${materialId}`);
  }

  // Course enrollment and students
  async getCourseStudents(courseId: string): Promise<any[]> {
    const response = await this.authenticatedGet<any>(`/api/v2/courses/${courseId}/students`);
    return response.data || response;
  }

  async removeStudent(courseId: string, studentId: string): Promise<void> {
    await this.authenticatedDelete(`/api/v2/courses/${courseId}/students/${studentId}`);
  }

  // Course analytics and progress
  async getCourseAnalytics(courseId: string): Promise<any> {
    const response = await this.authenticatedGet<any>(`/api/v2/courses/${courseId}/analytics`);
    return response.data || response;
  }

  async getStudentProgress(courseId: string, studentId?: string): Promise<any> {
    const endpoint = studentId 
      ? `/api/v2/courses/${courseId}/progress/${studentId}`
      : `/api/v2/courses/${courseId}/progress`;
    
    const response = await this.authenticatedGet<any>(endpoint);
    return response.data || response;
  }
}