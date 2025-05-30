/**
 * Module-related endpoint handlers
 */

import { apiClient } from '../client';
import type {
  Module,
  FileInfo,
  CreateModuleRequest,
  UpdateModuleRequest,
} from '../../../types/api';

export const moduleAPI = {
  // Course modules management
  getCourseModules: async (courseId: string): Promise<Module[]> => {
    const response = await apiClient.get(`/api/v2/courses/${courseId}/modules`);
    
    // Handle different response formats
    if (response && typeof response === 'object') {
      if (Array.isArray((response as any).data)) {
        return (response as any).data;
      } else if (Array.isArray(response)) {
        return response;
      }
    }
    return [];
  },

  createModule: (courseId: string, data: CreateModuleRequest): Promise<Module> => 
    apiClient.post(`/api/v2/courses/${courseId}/modules`, data),

  getModule: (moduleId: string): Promise<Module> => 
    apiClient.get(`/api/v2/modules/${moduleId}`),

  updateModule: (moduleId: string, data: UpdateModuleRequest): Promise<Module> => 
    apiClient.patch(`/api/v2/modules/${moduleId}`, data),

  deleteModule: (moduleId: string) => 
    apiClient.delete(`/api/v2/modules/${moduleId}`),

  // Module files
  getModuleFiles: (moduleId: string): Promise<FileInfo[]> => 
    apiClient.get(`/api/v2/modules/${moduleId}/files`),
};