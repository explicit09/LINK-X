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
    // Base client already unwraps v2 responses
    return await this.authenticatedGet<Course[]>('/api/v2/courses');
  }

  async getCourse(courseId: string): Promise<Course> {
    // Base client already unwraps v2 responses
    return await this.authenticatedGet<Course>(`/api/v2/courses/${courseId}`);
  }

  async createCourse(courseData: Partial<Course>): Promise<Course> {
    console.log('📤 CourseClient: Creating course with data:', courseData);
    const response = await this.authenticatedPost<any>('/api/v2/courses', courseData);
    console.log('📥 CourseClient: Raw create course response:', response);
    console.log('🔍 CourseClient: Response type:', typeof response);
    console.log('🔍 CourseClient: Response has .data?', response && 'data' in response);
    console.log('🔍 CourseClient: Response.id:', response?.id);
    console.log('🔍 CourseClient: Response.data?.id:', response?.data?.id);
    
    // Don't double-unwrap - base client already unwraps v2 responses
    return response;
  }

  async updateCourse(courseId: string, updates: Partial<Course>): Promise<Course> {
    // Base client already unwraps v2 responses
    return await this.authenticatedPatch<Course>(`/api/v2/courses/${courseId}`, updates);
  }

  async deleteCourse(courseId: string): Promise<void> {
    await this.authenticatedDelete(`/api/v2/courses/${courseId}`);
  }

  async joinCourse(accessCode: string): Promise<Course> {
    // Base client already unwraps v2 responses
    return await this.authenticatedPost<Course>('/api/v2/courses/join', { 
      access_code: accessCode 
    });
  }

  async leaveCourse(courseId: string): Promise<void> {
    await this.authenticatedDelete(`/api/v2/courses/${courseId}/leave`);
  }

  // Module management
  async getModules(courseId: string): Promise<Module[]> {
    // Base client already unwraps v2 responses
    return await this.authenticatedGet<Module[]>(`/api/v2/courses/${courseId}/modules`);
  }

  async createModule(courseId: string, moduleData: Partial<Module>): Promise<Module> {
    // Base client already unwraps v2 responses
    return await this.authenticatedPost<Module>(
      `/api/v2/courses/${courseId}/modules`, 
      moduleData
    );
  }

  async updateModule(moduleId: string, updates: Partial<Module>): Promise<Module> {
    // Base client already unwraps v2 responses
    return await this.authenticatedPatch<Module>(`/api/v2/modules/${moduleId}`, updates);
  }

  async deleteModule(moduleId: string): Promise<void> {
    await this.authenticatedDelete(`/api/v2/modules/${moduleId}`);
  }

  // File/Material management
  async uploadFile(courseId: string, moduleId: string, file: File): Promise<Material> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('module_id', moduleId);

    // Base client already unwraps v2 responses
    return await this.authenticatedPost<Material>(
      `/api/v2/courses/${courseId}/upload-content`,
      formData
    );
  }

  async getMaterials(moduleId: string): Promise<Material[]> {
    // Base client already unwraps v2 responses
    return await this.authenticatedGet<Material[]>(`/api/v2/modules/${moduleId}/materials`);
  }

  async deleteMaterial(materialId: string): Promise<void> {
    await this.authenticatedDelete(`/api/v2/materials/${materialId}`);
  }

  // Course enrollment and students
  async getCourseStudents(courseId: string): Promise<any[]> {
    // Base client already unwraps v2 responses
    return await this.authenticatedGet<any[]>(`/api/v2/courses/${courseId}/students`);
  }

  async removeStudent(courseId: string, studentId: string): Promise<void> {
    await this.authenticatedDelete(`/api/v2/courses/${courseId}/students/${studentId}`);
  }

  // Course analytics and progress
  async getCourseAnalytics(courseId: string): Promise<any> {
    // Base client already unwraps v2 responses
    return await this.authenticatedGet<any>(`/api/v2/courses/${courseId}/analytics`);
  }

  async getStudentProgress(courseId: string, studentId?: string): Promise<any> {
    const endpoint = studentId 
      ? `/api/v2/courses/${courseId}/progress/${studentId}`
      : `/api/v2/courses/${courseId}/progress`;
    
    // Base client already unwraps v2 responses
    return await this.authenticatedGet<any>(endpoint);
  }
}