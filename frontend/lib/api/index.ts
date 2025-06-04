/**
 * Modern API client - refactored from monolithic api.ts
 */

// Core client and utilities
export { apiClient, APIError } from './client';
export * from './utils';
export * from './types';

// All endpoint APIs
export * from './endpoints';

// Backwards compatibility - preserve the original api object structure
import { apiClient } from './client';

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
      onError: (error: Error) => void,
    ) => {
      return apiClient.stream(
        `/api/v2/files/${fileId}/stream-content`,
        options,
        onMessage,
        onError,
      );
    },
  },
};

// Default export
export default api;
