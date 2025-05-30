/**
 * Activity-related endpoint handlers
 */

import { apiClient } from '../client';
import type {
  CreateActivityRequest,
  CreateDiscussionRequest,
  ChatRequest,
} from '../../../types/api';

export const activityAPI = {
  // Activity logging and tracking
  logActivity: (data: CreateActivityRequest) => 
    apiClient.post('/api/v2/activities/log', data),

  getRecentActivities: async () => {
    const response = await apiClient.get('/api/v2/activities/recent');
    return (response as any).data || [];
  },

  getDashboardStats: async () => {
    const response = await apiClient.get('/api/v2/activities/stats');
    return (response as any).data || response;
  },

  // Discussions
  postDiscussion: (courseId: string, data: CreateDiscussionRequest) => 
    apiClient.post(`/api/v2/courses/${courseId}/discussions`, data),

  // AI Chat
  chatWithAI: (data: ChatRequest) => 
    apiClient.post('/api/v2/ai/chat', data),
};