/**
 * File-related endpoint handlers
 */

import { apiClient } from '../client';
import { getAuthToken } from './auth';
import type { FileInfo, UpdateFileRequest } from '../../../types/api';

export const fileAPI = {
  // Basic file operations
  uploadFile: (moduleId: string, formData: FormData) => {
    formData.append('moduleId', moduleId);
    return apiClient.post(`/api/v2/files/upload`, formData);
  },

  getFile: (fileId: string): Promise<FileInfo> =>
    apiClient.get(`/api/v2/files/${fileId}`),

  updateFile: (fileId: string, data: UpdateFileRequest): Promise<FileInfo> =>
    apiClient.patch(`/api/v2/files/${fileId}`, data),

  deleteFile: (fileId: string) => apiClient.delete(`/api/v2/files/${fileId}`),

  downloadFile: (fileId: string) =>
    apiClient.get(`/api/v2/files/${fileId}/download`),

  getFileContent: (fileId: string) =>
    apiClient.get(`/api/v2/files/${fileId}/content`),

  // File URL generation with authentication
  getFileUrl: async (fileId: string) => {
    try {
      const token = await getAuthToken();
      const rawResponse = await fetch(
        `http://localhost:8000/api/v2/files/${fileId}/content`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!rawResponse.ok) {
        throw new Error(
          `Failed to access file: ${rawResponse.status} ${rawResponse.statusText}`,
        );
      }

      const contentType = rawResponse.headers.get('content-type');

      // Check for presigned URL response
      if (contentType && contentType.includes('application/json')) {
        const data = await rawResponse.json();
        if (data.type === 'presigned' && data.url) {
          return { url: data.url };
        }
      }

      // Traditional file storage with auth token
      return {
        url: `http://localhost:8000/api/v2/files/${fileId}/content${token ? `?token=${token}` : ''}`,
      };
    } catch (error) {
      console.error('Failed to access file:', error);
      throw new Error(
        error instanceof Error ? error.message : 'File not accessible',
      );
    }
  },

  // File search
  searchFiles: (query: string, courseId?: string, fileType?: string) => {
    const params = new URLSearchParams({ q: query });
    if (courseId) params.append('courseId', courseId);
    if (fileType) params.append('type', fileType);
    return apiClient.get(`/api/v2/files/search?${params.toString()}`);
  },
};
