// Re-export all API modules
export * from './client';
export * from './auth';
export * from './courses';
export * from './files';
export * from './streaming';

// Import API instances
import { authAPI } from './auth';
import { courseAPI } from './courses';
import { fileAPI } from './files';
import { streamingAPI } from './streaming';
import { apiClient } from './client';

// Create unified API object for convenience
export const api = {
  client: apiClient,
  auth: authAPI,
  courses: courseAPI,
  files: fileAPI,
  streaming: streamingAPI,
  
  // Legacy compatibility helpers
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  patch: apiClient.patch.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),
};

// Default export
export default api;