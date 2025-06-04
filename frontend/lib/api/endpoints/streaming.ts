/**
 * Streaming endpoint handlers
 */

import { apiClient } from '../client';

export const streamingAPI = {
  // Stream learning content
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
};
