/**
 * Authentication endpoint handlers
 */

import { auth } from '../../../firebaseconfig';
import { authService } from '../../auth-service';
import type { UserProfile } from '../../../types/api';

interface UserProfileResponse {
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  id: string;
  data: any; // Keep original response for compatibility
}
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
    getProfile: async (): Promise<UserProfileResponse> => {
      const response = await apiClient.get<any>('/api/v2/auth/me');
      console.log('Raw API response:', response);
      
      // Extract the actual user data from the v2 API response structure
      let userData;
      if (response.data !== undefined) {
        // Response is wrapped in { success: true, data: {...} } format
        userData = response.data;
      } else {
        // Response is unwrapped
        userData = response;
      }
      
      // Map backend fields to frontend expected format
      return {
        name: userData.display_name || 'Student',
        email: userData.email,
        avatar: userData.profile?.avatar_url,
        role: userData.role?.type,
        id: userData.id,
        // Keep original data for compatibility
        data: userData
      };
    },
    createProfile: (data: Partial<UserProfile>) =>
      apiClient.post('/api/v2/auth/me', data),
    updateProfile: (data: Partial<UserProfile>) =>
      apiClient.patch('/api/v2/auth/me', data),
    deleteProfile: () => apiClient.delete('/api/v2/auth/me'),
    
    // Registration endpoints
    checkRegistration: async () => {
      // This endpoint specifically requires Firebase token, not backend JWT
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No Firebase user found');
      }
      
      try {
        const firebaseToken = await user.getIdToken();
        return apiClient.get('/api/v2/auth/check-registration', {
          headers: {
            'X-Firebase-Token': firebaseToken
          },
          skipAuth: true // Skip the normal auth header logic
        });
      } catch (error) {
        console.error('Failed to get Firebase token for registration check:', error);
        throw error;
      }
    },
    register: async (data: {
      role: 'student' | 'instructor';
      name?: string;
      onboard_answers?: any;
      want_quizzes?: boolean;
      university?: string;
      department?: string;
    }) => {
      // Registration endpoint requires Firebase token
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No Firebase user found');
      }
      
      try {
        const firebaseToken = await user.getIdToken();
        return apiClient.post('/api/v2/auth/register', data, {
          headers: {
            'X-Firebase-Token': firebaseToken
          },
          skipAuth: true // Skip the normal auth header logic
        });
      } catch (error) {
        console.error('Failed to get Firebase token for registration:', error);
        throw error;
      }
    },
  },
};
