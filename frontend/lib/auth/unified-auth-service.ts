/**
 * Unified Authentication Service
 * Uses the new streamlined backend authentication endpoints
 */
import { authService } from './supabase-auth-service';

export interface UnifiedSession {
  authenticated: boolean;
  registered: boolean;
  requires_onboarding: boolean;
  user: {
    id: string;
    email: string;
    display_name: string;
    role: string;
    has_completed_onboarding: boolean;
    firebase_uid?: string;
    created_at?: string;
  };
  session?: {
    access_token: string;
    expires_in: number;
  };
}

export interface RegistrationData {
  access_token: string;
  role: 'student' | 'instructor';
  name?: string;
  onboard_answers?: Record<string, any>;
  want_quizzes?: boolean;
  university?: string;
  department?: string;
}

export interface OnboardingData {
  access_token: string;
  onboard_answers: Record<string, any>;
  want_quizzes?: boolean;
}

class UnifiedAuthService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  /**
   * Create a session using unified endpoint
   * This replaces login + registration check + onboarding status check
   */
  async createSession(): Promise<UnifiedSession | null> {
    try {
      const token = await authService.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const response = await fetch(`${this.baseUrl}/api/v2/auth/unified/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Session creation failed');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Session creation error:', error);
      return null;
    }
  }

  /**
   * Register a new user
   */
  async registerUser(registrationData: RegistrationData): Promise<UnifiedSession | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/auth/unified/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Complete onboarding for a student
   */
  async completeOnboarding(onboardingData: OnboardingData): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/auth/unified/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(onboardingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Onboarding completion failed');
      }

      return true;
    } catch (error) {
      console.error('Onboarding completion error:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<any | null> {
    try {
      const token = await authService.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const response = await fetch(`${this.baseUrl}/api/v2/auth/unified/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Profile fetch failed');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Profile fetch error:', error);
      return null;
    }
  }

  /**
   * Check if user needs to complete onboarding
   */
  isOnboardingRequired(session: UnifiedSession): boolean {
    return session.requires_onboarding || !session.user.has_completed_onboarding;
  }

  /**
   * Determine the redirect path after authentication
   */
  getRedirectPath(session: UnifiedSession): string {
    if (!session.authenticated) {
      return '/login';
    }

    if (!session.registered) {
      return '/onboarding';
    }

    if (this.isOnboardingRequired(session)) {
      return '/onboarding';
    }

    // User is fully authenticated and onboarded
    return '/dashboard';
  }
}

export const unifiedAuthService = new UnifiedAuthService();
export default unifiedAuthService;