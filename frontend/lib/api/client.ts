// MOCK API CLIENT MODE
// Using mock client that returns dummy data without backend calls
// To re-enable real API, uncomment the original exports below

import { mockApiClient } from './mock-client';

// Export mock client as the main client
export const apiClient = mockApiClient;
export class APIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}
export type RequestConfig = any;
export class APIClient {
  // Mock implementation
}

// Original API client exports (disabled in mock mode)
/*
export { apiClient, APIError, type RequestConfig } from './clients/index';
export { APIClient } from './clients/index';
*/