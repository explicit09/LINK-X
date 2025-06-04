/**
 * Admin-related endpoint handlers
 */

import { apiClient } from '../client';
import type {
  UpdateUserRequest,
  CreateNewsRequest,
  UpdateNewsRequest,
  CreateMarketDataRequest,
  UpdateMarketDataRequest,
} from '../../../types/api';

export const adminAPI = {
  // User management
  getUsers: () => apiClient.get('/admin/users'),
  getUser: (userId: string) => apiClient.get(`/admin/users/${userId}`),
  updateUser: (userId: string, data: UpdateUserRequest) =>
    apiClient.patch(`/admin/users/${userId}`, data),
  deleteUser: (userId: string) => apiClient.delete(`/admin/users/${userId}`),

  // News management
  getNews: () => apiClient.get('/admin/news'),
  createNews: (data: CreateNewsRequest) => apiClient.post('/admin/news', data),
  getNewsItem: (newsId: string) => apiClient.get(`/admin/news/${newsId}`),
  updateNews: (newsId: string, data: UpdateNewsRequest) =>
    apiClient.patch(`/admin/news/${newsId}`, data),
  deleteNews: (newsId: string) => apiClient.delete(`/admin/news/${newsId}`),

  // Market data management
  getMarketData: () => apiClient.get('/admin/market'),
  createMarketData: (data: CreateMarketDataRequest) =>
    apiClient.post('/admin/market', data),
  getMarketEntry: (marketId: string) =>
    apiClient.get(`/admin/market/${marketId}`),
  updateMarketData: (marketId: string, data: UpdateMarketDataRequest) =>
    apiClient.patch(`/admin/market/${marketId}`, data),
  deleteMarketData: (marketId: string) =>
    apiClient.delete(`/admin/market/${marketId}`),
};
