import type { AuthTokens } from './token-manager';

// Use the API URL from environment or fallback to localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface UserProfile {
  id: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  profile?: {
    name?: string;
    university?: string;
  };
  has_completed_onboarding?: boolean;
}

/**
 * UserManager - Handles user profile management and API calls
 * COPIED from working auth-service.ts to preserve exact functionality
 */
export class UserManager {
  constructor(
    private getValidToken: () => Promise<string | null>
  ) {}

  /**
   * Check registration status
   * PRESERVE exact logic from auth-service checkRegistrationStatus
   */
  async checkRegistrationStatus(): Promise<{
    isRegistered: boolean;
    user: UserProfile | null;
  }> {
    try {
      const token = await this.getValidToken();
      if (!token) {
        return { isRegistered: false, user: null };
      }

      const response = await fetch(`${API_URL}/api/v2/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      if (response.ok) {
        const userData = await response.json();
        return { 
          isRegistered: true, 
          user: userData.data || userData // Handle wrapped responses
        };
      }

      // If 404, user needs to complete registration
      if (response.status === 404) {
        return { isRegistered: false, user: null };
      }

      // For other errors, assume not registered
      console.error(`Registration check failed with status: ${response.status}`);
      return { isRegistered: false, user: null };

    } catch (error) {
      console.error('Registration check failed:', error);
      return { isRegistered: false, user: null };
    }
  }

  /**
   * Get user profile
   * PRESERVE exact API call pattern from working auth service
   */
  async getProfile(): Promise<UserProfile | null> {
    try {
      const token = await this.getValidToken();
      if (!token) return null;

      const response = await fetch(`${API_URL}/api/v2/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      if (response.ok) {
        const userData = await response.json();
        return userData.data || userData; // Handle wrapped responses
      }

      return null;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<boolean> {
    try {
      const token = await this.getValidToken();
      if (!token) return false;

      const response = await fetch(`${API_URL}/api/v2/auth/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to update user profile:', error);
      return false;
    }
  }

  /**
   * Make authenticated request to any endpoint
   * PRESERVE exact retry logic from auth-service makeAuthenticatedRequest
   */
  async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const token = await this.getValidToken();

    if (!token) {
      throw new Error('No valid authentication token');
    }

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If 401, the token manager should handle refresh, so just return the response
    // The calling code can handle retries if needed
    return response;
  }

  /**
   * Logout user from backend
   */
  async logoutFromBackend(token: string): Promise<void> {
    try {
      await fetch(`${API_URL}/api/v2/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Backend logout failed:', error);
      // Don't throw - logout should succeed even if backend call fails
    }
  }
}