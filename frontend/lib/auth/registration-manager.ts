import { User as SupabaseUser } from '@supabase/supabase-js';
import type { AuthTokens } from './token-manager';
import type { UserProfile } from './user-manager';

// Use the API URL from environment or fallback to localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000,    // 10 seconds
  backoffMultiplier: 2,
};

// Network error messages
const NETWORK_ERROR_MESSAGES = {
  CONNECTION_LOST: 'Network connection lost. Please check your internet connection.',
  BACKEND_UNAVAILABLE: 'Unable to connect to the server. Please try again in a moment.',
  TIMEOUT: 'Request timed out. Please try again.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
};

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
 * Updated to use Supabase authentication
 */
export class RegistrationManager {
  constructor(
    private supabaseManager: { getSupabaseToken: (user: SupabaseUser) => Promise<string | null> },
    private onAuthStateUpdated: (state: {
      isAuthenticated: boolean;
      isRegistered: boolean;
      tokens: AuthTokens | null;
      user: UserProfile | null;
    }) => void
  ) {}

  /**
   * Check if backend is healthy before attempting requests
   */
  private async checkBackendHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${API_URL}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = RETRY_CONFIG.initialDelay;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        // Check backend health before each attempt (except the first)
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt} for ${operationName} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          const isHealthy = await this.checkBackendHealth();
          if (!isHealthy) {
            console.warn('Backend health check failed, but proceeding with request');
          }
        }

        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }

        console.error(`${operationName} attempt ${attempt + 1} failed:`, error);

        // Calculate next delay with exponential backoff
        delay = Math.min(delay * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelay);
      }
    }

    // If we've exhausted all retries, throw the last error
    throw lastError || new Error(`${operationName} failed after ${RETRY_CONFIG.maxRetries} retries`);
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error instanceof TypeError && error.message.includes('Load failed')) {
      return true;
    }
    
    // Connection errors are retryable
    if (error instanceof TypeError && error.message.includes('network')) {
      return true;
    }
    
    // Abort errors are retryable
    if (error.name === 'AbortError') {
      return true;
    }
    
    // Specific HTTP status codes that are NOT retryable
    if (error.status && [400, 401, 403, 404, 422].includes(error.status)) {
      return false;
    }
    
    // Specific HTTP status codes that are retryable
    if (error.status && [502, 503, 504, 429].includes(error.status)) {
      return true;
    }
    
    return false;
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    if (error instanceof TypeError) {
      if (error.message.includes('Load failed') || error.message.includes('network')) {
        return NETWORK_ERROR_MESSAGES.CONNECTION_LOST;
      }
    }
    
    if (error.name === 'AbortError') {
      return NETWORK_ERROR_MESSAGES.TIMEOUT;
    }
    
    if (error.status === 503 || error.status === 502) {
      return NETWORK_ERROR_MESSAGES.BACKEND_UNAVAILABLE;
    }
    
    return NETWORK_ERROR_MESSAGES.UNKNOWN;
  }

  /**
   * Login with Supabase user and establish backend session
   */
  async login(supabaseUser: SupabaseUser): Promise<boolean> {
    try {
      // Get Supabase ID token
      const idToken = await this.supabaseManager.getSupabaseToken(supabaseUser);
      if (!idToken) {
        console.error('Failed to get Supabase token');
        return false;
      }

      // Check backend health before attempting login
      const isHealthy = await this.checkBackendHealth();
      if (!isHealthy) {
        console.warn('Backend health check failed, attempting login anyway');
      }

      // Try to establish session with backend using retry logic
      let response: Response;
      try {
        response = await this.retryWithBackoff(
          async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            try {
              const resp = await fetch(`${API_URL}/api/v2/auth/login`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ idToken }),
                signal: controller.signal,
              });

              clearTimeout(timeoutId);
              return resp;
            } catch (error) {
              clearTimeout(timeoutId);
              throw error;
            }
          },
          'login'
        );
      } catch (error) {
        // Network error occurred
        throw error;
      }

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
          return true; // Supabase auth successful, but needs registration
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
      const errorMessage = this.getErrorMessage(error);
      console.error('Login failed:', error);
      console.error('User-friendly error:', errorMessage);
      
      // Store error message for UI display
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('auth_error', errorMessage);
      }
      
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
      // Get current Supabase user
      const { supabase } = await import('@/supabaseconfig');
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (!supabaseUser) {
        console.error('No Supabase user found. User must be created in Supabase first.');
        return false;
      }

      // Get Supabase access token
      const { data: { session } } = await supabase.auth.getSession();
      const idToken = session?.access_token;
      if (!idToken) {
        console.error('No Supabase access token available');
        return false;
      }
      console.log('Got Supabase access token for registration');

      // Check backend health before attempting registration
      const isHealthy = await this.checkBackendHealth();
      if (!isHealthy) {
        console.warn('Backend health check failed, attempting registration anyway');
      }

      const response = await this.retryWithBackoff(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

          try {
            const resp = await fetch(`${API_URL}/api/v2/auth/register`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Supabase-Token': idToken,
              },
              body: JSON.stringify(registrationData),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // For non-2xx responses, create an error with status
            if (!resp.ok) {
              const error: any = new Error(`HTTP ${resp.status}`);
              error.status = resp.status;
              error.response = resp;
              throw error;
            }

            return resp;
          } catch (error) {
            clearTimeout(timeoutId);
            throw error;
          }
        },
        'register'
      );

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
      const errorMessage = this.getErrorMessage(error);
      console.error('Registration failed:', error);
      console.error('User-friendly error:', errorMessage);
      
      // Store error message for UI display
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('auth_error', errorMessage);
      }
      
      return false;
    }
  }

  /**
   * Force session establishment
   */
  async forceSessionEstablishment(supabaseUser: SupabaseUser): Promise<boolean> {
    if (!supabaseUser) {
      console.error('No Supabase user available for session establishment');
      return false;
    }

    console.log('Force session establishment - checking backend health first');
    
    // Check backend health with retry
    let isHealthy = false;
    for (let i = 0; i < 3; i++) {
      isHealthy = await this.checkBackendHealth();
      if (isHealthy) {
        break;
      }
      console.log(`Backend health check attempt ${i + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
    
    if (!isHealthy) {
      const errorMessage = NETWORK_ERROR_MESSAGES.BACKEND_UNAVAILABLE;
      console.error('Backend is not healthy after multiple attempts');
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('auth_error', errorMessage);
      }
    }

    // Force session establishment - clear any stale state first
    this.onAuthStateUpdated({
      isAuthenticated: false,
      isRegistered: false,
      tokens: null,
      user: null,
    });
    
    return await this.login(supabaseUser);
  }
}