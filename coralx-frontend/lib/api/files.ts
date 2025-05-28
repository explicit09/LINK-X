import { apiClient } from './client';

export interface FileUploadResponse {
  id: string;
  title: string;
  filename: string;
  file_type: string;
  file_size: number;
  module_id: string;
  s3_key?: string;
  processed: boolean;
}

export interface FileContent {
  id: string;
  content: string;
  extracted_text?: string;
  metadata?: Record<string, any>;
}

export interface FilePreview {
  preview_url: string;
  expires_at?: string;
}

class FileAPI {
  // File upload
  async uploadFile(moduleId: string, file: File, title?: string, description?: string): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('moduleId', moduleId);
    if (title) formData.append('title', title);
    if (description) formData.append('description', description);
    
    return apiClient.post<FileUploadResponse>('/api/v1/files/upload', formData);
  }

  // File operations
  async getFile(fileId: string): Promise<FileUploadResponse> {
    return apiClient.get<FileUploadResponse>(`/api/v1/files/${fileId}`);
  }

  async downloadFile(fileId: string): Promise<Response> {
    return apiClient.get<Response>(`/api/v1/files/${fileId}/download`);
  }

  async getFilePreview(fileId: string): Promise<FilePreview> {
    return apiClient.get<FilePreview>(`/api/v1/files/${fileId}/preview`);
  }

  async deleteFile(fileId: string): Promise<void> {
    await apiClient.delete(`/api/v1/files/${fileId}`);
  }

  // Module files
  async getModuleFiles(moduleId: string): Promise<FileUploadResponse[]> {
    return apiClient.get<FileUploadResponse[]>(`/api/v1/files/module/${moduleId}`);
  }

  // Search
  async searchFiles(query: string, courseId?: string, fileType?: string): Promise<FileUploadResponse[]> {
    const params: Record<string, string> = { q: query };
    if (courseId) params.courseId = courseId;
    if (fileType) params.type = fileType;
    
    return apiClient.get<FileUploadResponse[]>('/api/v1/files/search', { params });
  }

  // Reprocessing
  async reprocessFile(fileId: string): Promise<void> {
    await apiClient.post(`/api/v1/files/process/${fileId}`);
  }

  // Streaming
  createFileStream(fileId: string): EventSource {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    return new EventSource(`${baseURL}/api/v1/files/${fileId}/stream`, {
      withCredentials: true
    });
  }

  // Legacy compatibility
  async getFileUrl(fileId: string): Promise<{ url: string }> {
    const preview = await this.getFilePreview(fileId);
    return { url: preview.preview_url };
  }

  async getFileContent(fileId: string): Promise<FileContent> {
    return apiClient.get<FileContent>(`/api/v1/files/${fileId}/content`);
  }
}

export const fileAPI = new FileAPI();