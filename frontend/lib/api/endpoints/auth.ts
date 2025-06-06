/**
 * Authentication endpoint handlers
 */

// Removed Firebase import - now using Supabase
import { authService } from '../../auth-service';
import type { UserProfile } from '../../../types/api';
import { AuthAPIClient } from '../clients/auth-client';
import { supabase } from '@/supabaseconfig';

interface UserProfileResponse {
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  id: string;
  data: any; // Keep original response for compatibility
}
import { apiClient } from '../client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Create a single auth client instance
const authClient = new AuthAPIClient();

export async function getAuthToken(): Promise<string | null> {
  return await authService.getValidToken();
}

export async function sessionLogin(forceEstablish = false): Promise<boolean> {
  console.warn('sessionLogin is deprecated - Supabase authentication is handled automatically');
  // For Supabase, session is handled automatically via callback
  return true;
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
      // Use consistent name fallback logic matching dashboard and course pages
      return {
        name: userData.profile?.name || userData.email?.split('@')[0] || 'User',
        email: userData.email,
        avatar: userData.profile?.avatar_url,
        role: userData.role?.type || userData.role,
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
    
    // Registration endpoints - updated to use Supabase
    checkRegistration: async () => {
      return checkRegistrationStatus();
    },
    register: async (data: {
      role: 'student' | 'instructor';
      name?: string;
      onboard_answers?: any;
      want_quizzes?: boolean;
      university?: string;
      department?: string;
    }) => {
      return registerUser(data);
    },
  },
};

export interface RegistrationCheckResponse {
  isRegistered: boolean;
  user?: UserProfile;
  has_completed_onboarding?: boolean;
}

/**
 * Check user registration status with backend
 * Updated to use Supabase tokens
 */
export async function checkRegistrationStatus(): Promise<RegistrationCheckResponse> {
  try {
    // This endpoint specifically requires Supabase token, not backend JWT
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No Supabase user found');
    }

    const supabaseToken = session.access_token;

    const response = await fetch(`${API_URL}/api/v2/auth/check-registration`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { isRegistered: false };
      }
      throw new Error(`Registration check failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Auth] Check registration raw response:', data);
    // The API returns { success: true, data: { registered: boolean, has_completed_onboarding: boolean, user: {...} } }
    const result = { 
      isRegistered: data.data?.registered || false,
      user: data.data?.user || null,
      has_completed_onboarding: data.data?.has_completed_onboarding ?? true
    };
    console.log('[Auth] Check registration parsed result:', result);
    return result;
  } catch (error) {
    console.error('Failed to check registration status:', error);
    return { isRegistered: false };
  }
}

/**
 * Register user with backend
 * Updated to use Supabase tokens
 */
export async function registerUser(userData: {
  role: 'student' | 'instructor';
  name?: string;
  university?: string;
  department?: string;
  onboard_answers?: Record<string, any>;
  want_quizzes?: boolean;
}): Promise<UserProfile | null> {
  try {
    // Registration endpoint requires Supabase token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No Supabase user found');
    }

    const supabaseToken = session.access_token;

    const response = await fetch(`${API_URL}/api/v2/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseToken}`
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to register user:', error);
    return null;
  }
}

/**
 * Login with session token
 */
export async function loginWithToken(accessToken: string): Promise<{
  access_token?: string;
  user?: UserProfile;
} | null> {
  try {
    const response = await authClient.authenticatedPost<{
      access_token?: string;
      user?: UserProfile;
    }>(`/api/v2/auth/login`, {
      token: accessToken
    });

    return response;
  } catch (error) {
    console.error('Failed to login with token:', error);
    return null;
  }
}

/**
 * Logout from backend
 */
export async function logoutFromBackend(): Promise<void> {
  try {
    await authClient.authenticatedPost(`/api/v2/auth/logout`, {});
  } catch (error) {
    console.error('Failed to logout from backend:', error);
  }
}
