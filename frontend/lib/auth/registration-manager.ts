import { User as FirebaseUser } from 'firebase/auth';
import type { AuthTokens } from './token-manager';
import type { UserProfile } from './user-manager';

// Use the API URL from environment or fallback to localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface RegistrationData {
  role: 'student' | 'instructor';
  name?: string;
  university?: string;
  department?: string;
  onboard_answers?: Record<string, any>;
  want_quizzes?: boolean;
}

export interface LoginResponse {
  tokens?: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  access_token?: string;
  token?: string;
  user?: UserProfile;
}

/**
 * RegistrationManager - Handles user registration and login flow
 * COPIED from working auth-service.ts to preserve exact functionality
 */
export class RegistrationManager {
  constructor(
    private firebaseManager: { getFirebaseToken: (user: FirebaseUser) => Promise<string | null> },
    private onAuthStateUpdated: (state: {
      isAuthenticated: boolean;
      isRegistered: boolean;
      tokens: AuthTokens | null;
      user: UserProfile | null;
    }) => void
  ) {}

  /**
   * Login with Firebase user and establish backend session
   * PRESERVE exact login logic from auth-service.ts
   */
  async login(firebaseUser: FirebaseUser): Promise<boolean> {
    try {
      // Get Firebase ID token
      const idToken = await this.firebaseManager.getFirebaseToken(firebaseUser);
      if (!idToken) {
        console.error('Failed to get Firebase token');
        return false;
      }

      // Try to establish session with backend
      // Create session with Firebase token
      const response = await fetch(`${API_URL}/api/v2/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        // If 404, user needs to complete registration
        if (response.status === 404) {
          // User needs to complete registration
          this.onAuthStateUpdated({
            isAuthenticated: true,
            isRegistered: false,
            tokens: null,
            user: null,
          });
          return true; // Firebase auth successful, but needs registration
        }

        // For other errors, clear auth state
        console.error(`Login failed with status: ${response.status}`);
        this.onAuthStateUpdated({
          isAuthenticated: false,
          isRegistered: false,
          tokens: null,
          user: null,
        });
        return false;
      }

      const responseData = await response.json();

      // Validate response structure
      if (!responseData) {
        console.error('Login failed: Empty response from backend');
        this.onAuthStateUpdated({
          isAuthenticated: false,
          isRegistered: false,
          tokens: null,
          user: null,
        });
        return false;
      }

      // Handle v2 API response format where data is wrapped in a 'data' field
      const data: LoginResponse = responseData.data || responseData;

      // Update auth state - handle both v1 and v2 response formats
      const accessToken = data.tokens?.access_token || data.access_token || data.token;
      const refreshToken = data.tokens?.refresh_token;
      const expiresIn = data.tokens?.expires_in || 24 * 60 * 60;
      
      if (!accessToken) {
        console.error('Login failed: No access token in response');
        console.error('Full response structure:', JSON.stringify(responseData, null, 2));
        console.error('Processed data structure:', JSON.stringify(data, null, 2));
        this.onAuthStateUpdated({
          isAuthenticated: false,
          isRegistered: false,
          tokens: null,
          user: null,
        });
        return false;
      }

      console.log('Login successful - access token found and auth state updated');
      
      this.onAuthStateUpdated({
        isAuthenticated: true,
        isRegistered: true, // If login succeeds, user is registered
        tokens: {
          accessToken,
          refreshToken,
          expiresAt: Date.now() + expiresIn * 1000,
        },
        user: data.user || null,
      });

      return true;
    } catch (error) {
      console.error('Login failed:', error);
      this.onAuthStateUpdated({
        isAuthenticated: false,
        isRegistered: false,
        tokens: null,
        user: null,
      });
      return false;
    }
  }

  /**
   * Register new user
   */
  async register(registrationData: RegistrationData): Promise<boolean> {
    try {
      // Import auth from firebaseconfig
      const { auth } = await import('@/firebaseconfig');
      
      // Get current Firebase user
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        console.error('No Firebase user found. User must be created in Firebase first.');
        return false;
      }

      // Get Firebase ID token
      const idToken = await firebaseUser.getIdToken();
      console.log('Got Firebase ID token for registration');

      const response = await fetch(`${API_URL}/api/v2/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-Token': idToken,
        },
        body: JSON.stringify(registrationData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Registration failed with status: ${response.status}`, errorData);
        return false;
      }

      const responseData = await response.json();
      
      // Handle v2 API response format where data is wrapped in a 'data' field
      const data = responseData.data || responseData;
      
      // Update auth state after successful registration
      const accessToken = data.tokens?.access_token || data.access_token || data.token;
      const refreshToken = data.tokens?.refresh_token;
      const expiresIn = data.tokens?.expires_in || 24 * 60 * 60;

      if (accessToken) {
        this.onAuthStateUpdated({
          isAuthenticated: true,
          isRegistered: true,
          tokens: {
            accessToken,
            refreshToken,
            expiresAt: Date.now() + expiresIn * 1000,
          },
          user: data.user || null,
        });
      }

      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  }

  /**
   * Force session establishment
   * PRESERVE exact logic from auth-service forceSessionEstablishment
   */
  async forceSessionEstablishment(firebaseUser: FirebaseUser): Promise<boolean> {
    if (!firebaseUser) {
      console.error('No Firebase user available for session establishment');
      return false;
    }

    // Force session establishment - clear any stale state first
    this.onAuthStateUpdated({
      isAuthenticated: false,
      isRegistered: false,
      tokens: null,
      user: null,
    });
    
    return await this.login(firebaseUser);
  }
}