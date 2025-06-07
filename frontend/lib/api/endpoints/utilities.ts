/**
 * Utility endpoint handlers
 */

import { apiClient } from '../client';
import type { GenerateTitleRequest } from '../../../types/api';

// API configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const utilityAPI = {
  // Title generation
  generateTitle: (data: GenerateTitleRequest) =>
    apiClient.post('/generate-title', data),
};

export const publicAPI = {
  // Public endpoints that don't require authentication
  getMarketRecent: () =>
    fetch(`${API_URL}/market/recent`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }).then((res) => res.json()),
};
