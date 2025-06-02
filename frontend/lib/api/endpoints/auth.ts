/**
 * Authentication endpoint handlers
 */

import { auth } from '../../../firebaseconfig';
import { authService } from '../../auth-service';
import type { UserProfile } from '../../../types/api';
import { apiClient } from '../client';

export async function getAuthToken(): Promise<string | null> {
  return await authService.getValidToken();
}

export async function sessionLogin(forceEstablish = false): Promise<boolean> {
  console.warn('sessionLogin is deprecated, use authService.login() instead');
  if (!auth.currentUser) {
    return false;
  }
  return await authService.login(auth.currentUser);
}

export const authAPI = {
  // User profile management
  getMe: (): Promise<UserProfile> => apiClient.get('/api/v2/auth/me'),
  updateMe: (data: Partial<UserProfile>) => apiClient.patch('/api/v2/auth/me', data),
  deleteMe: () => apiClient.delete('/api/v2/auth/me'),

  // Profile endpoints for different API versions
  v2: {
    getProfile: (): Promise<UserProfile> => apiClient.get('/api/v2/auth/me'),
    createProfile: (data: Partial<UserProfile>) =>
      apiClient.post('/api/v2/auth/me', data),
    updateProfile: (data: Partial<UserProfile>) =>
      apiClient.patch('/api/v2/auth/me', data),
    deleteProfile: () => apiClient.delete('/api/v2/auth/me'),
    
    // Registration endpoints
    checkRegistration: () => apiClient.get('/api/v2/auth/check-registration'),
    register: (data: {
      role: 'student' | 'instructor';
      name?: string;
      onboard_answers?: any;
      want_quizzes?: boolean;
      university?: string;
      department?: string;
    }) => apiClient.post('/api/v2/auth/register', data),
  },
};
