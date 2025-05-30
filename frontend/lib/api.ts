/**
 * Refactored API client - maintains full backward compatibility
 * This is the new modular version of api.ts
 */

// Import all components
import { apiClient } from './api/client';
import { getAuthToken, sessionLogin } from './api/endpoints/auth';
import { studentAPI } from './api/studentAPI';
import { instructorAPI } from './api/instructorAPI';
import { userAPI } from './api/userAPI';
import { courseAPI } from './api/endpoints/courses';
import { adminAPI } from './api/endpoints/admin';
import { utilityAPI, publicAPI } from './api/endpoints/utilities';

// Re-export auth helpers for backward compatibility
export { getAuthToken, sessionLogin };

// Legacy fetchWithAuth - now uses the modern client
export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
  retryWithSessionLogin = true,
  timeoutMs = 10000,
  maxRetries = 2
) {
  const method = options.method || 'GET';
  const config = {
    ...options,
    timeout: timeoutMs,
    retryCount: maxRetries,
    skipAuth: !retryWithSessionLogin,
  };

  switch (method.toUpperCase()) {
    case 'GET':
      return apiClient.get(endpoint, config);
    case 'POST':
      return apiClient.post(endpoint, options.body, config);
    case 'PUT':
      return apiClient.put(endpoint, options.body, config);
    case 'PATCH':
      return apiClient.patch(endpoint, options.body, config);
    case 'DELETE':
      return apiClient.delete(endpoint, config);
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }
}

// Generic API methods - backward compatibility
export const api = {
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  patch: apiClient.patch.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),
  
  // Streaming API
  streaming: {
    streamLearningContent: (
      fileId: string,
      options: { style?: string } = {},
      onMessage: (message: unknown) => void,
      onError: (error: Error) => void
    ) => {
      return apiClient.stream(
        `/api/v2/files/${fileId}/stream-content`,
        options,
        onMessage,
        onError
      );
    }
  }
};

// Export all role-specific APIs
export { userAPI, studentAPI, instructorAPI, courseAPI, adminAPI, utilityAPI, publicAPI };

// Default export maintains backward compatibility
export default api;