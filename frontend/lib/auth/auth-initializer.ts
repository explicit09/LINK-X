/**
 * Auth Initializer
 * Handles initial authentication state and session management
 */
import { authAPI } from '@/lib/api';
import { getCurrentUser, getAccessToken } from './supabase-auth-service';

interface AuthState {
  isAuthenticated: boolean;
  isRegistered: boolean;
  needsOnboarding: boolean;
  user?: any;
}

let cachedAuthState: AuthState | null = null;

/**
 * Initialize authentication and check user registration status
 */
export async function initializeAuth(): Promise<AuthState> {
  try {
    // Check if user is authenticated with Supabase
    const user = await getCurrentUser();
    
    if (!user) {
      const authState = {
        isAuthenticated: false,
        isRegistered: false,
        needsOnboarding: false
      };
      cachedAuthState = authState;
      return authState;
    }

    // User is authenticated, check registration status
    try {
      const registrationCheck = await authAPI.v2.checkRegistration();
      
      const authState = {
        isAuthenticated: true,
        isRegistered: registrationCheck.isRegistered,
        needsOnboarding: !registrationCheck.has_completed_onboarding,
        user: registrationCheck.user
      };
      
      cachedAuthState = authState;
      return authState;
    } catch (error: any) {
      // If check-registration returns 404, user needs registration
      if (error?.status === 404 || error?.response?.status === 404) {
        const authState = {
          isAuthenticated: true,
          isRegistered: false,
          needsOnboarding: true,
          user
        };
        cachedAuthState = authState;
        return authState;
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error initializing auth:', error);
    const authState = {
      isAuthenticated: false,
      isRegistered: false,
      needsOnboarding: false
    };
    cachedAuthState = authState;
    return authState;
  }
}

/**
 * Reset cached auth state
 */
export function resetAuthInitializer() {
  cachedAuthState = null;
}

/**
 * Get cached auth state if available
 */
export function getCachedAuthState(): AuthState | null {
  return cachedAuthState;
}