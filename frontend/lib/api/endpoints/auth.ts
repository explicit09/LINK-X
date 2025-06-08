/**
 * Authentication API Endpoints
 * Simplified for Supabase-only authentication
 */

import { apiClient } from '../client'

/**
 * DEPRECATED: sessionLogin is no longer needed with modern Supabase auth
 * Sessions are handled automatically by Supabase client
 */
export async function sessionLogin(forceEstablish = false): Promise<boolean> {
  console.warn('sessionLogin is deprecated - Supabase authentication is handled automatically via middleware');
  return true;
}

/**
 * Get current user profile from backend
 * This still may be needed for additional user data not stored in Supabase auth
 */
export async function getCurrentUser(): Promise<any | null> {
  try {
    const response = await apiClient.get('/api/v2/auth/me');
    return response;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(data: any): Promise<any | null> {
  try {
    const response = await apiClient.patch('/api/v2/auth/me', data);
    return response;
  } catch (error) {
    console.error('Failed to update user profile:', error);
    return null;
  }
}

/**
 * Check user registration status
 */
export async function checkRegistrationStatus(): Promise<{
  isRegistered: boolean;
  has_completed_onboarding?: boolean;
}> {
  try {
    const response = await apiClient.get<{
      isRegistered: boolean;
      has_completed_onboarding?: boolean;
    }>('/api/v2/auth/check-registration');
    return response;
  } catch (error) {
    console.error('Failed to check registration status:', error);
    return { isRegistered: false };
  }
}

/**
 * DEPRECATED: getAuthToken is no longer needed with modern Supabase auth
 * Tokens are handled automatically by Supabase client
 */
export async function getAuthToken(): Promise<string | null> {
  console.warn('getAuthToken is deprecated - Supabase handles tokens automatically');
  return null;
}

/**
 * Auth API object for backward compatibility
 */
export const authAPI = {
  sessionLogin,
  getCurrentUser,
  updateUserProfile,
  checkRegistrationStatus,
  getAuthToken,
  
  // V2 endpoints for profile management
  v2: {
    getProfile: async () => {
      try {
        const response = await apiClient.get('/api/v2/auth/profile');
        return response;
      } catch (error) {
        console.error('Failed to get profile:', error);
        throw error;
      }
    },
    updateProfile: async (data: any) => {
      try {
        const response = await apiClient.patch('/api/v2/auth/profile', data);
        return response;
      } catch (error) {
        console.error('Failed to update profile:', error);
        throw error;
      }
    },
    createProfile: async (data: any) => {
      try {
        const response = await apiClient.post('/api/v2/auth/profile', data);
        return response;
      } catch (error) {
        console.error('Failed to create profile:', error);
        throw error;
      }
    },
    deleteProfile: async () => {
      try {
        const response = await apiClient.delete('/api/v2/auth/profile');
        return response;
      } catch (error) {
        console.error('Failed to delete profile:', error);
        throw error;
      }
    }
  },
  
  // Legacy methods for backward compatibility
  getMe: getCurrentUser,
  updateMe: updateUserProfile,
  deleteMe: async () => {
    console.warn('deleteMe is not implemented - use Supabase user deletion');
    throw new Error('User deletion not implemented');
  }
};
