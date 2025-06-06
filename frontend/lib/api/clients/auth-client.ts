import { supabase } from '@/supabaseconfig';
import { BaseAPIClient, APIError, type RequestConfig } from './base-client';

/**
 * AuthAPIClient - Handles authentication and adds auth headers to requests
 * COPIED from working api/client.ts to preserve exact auth logic
 */
export class AuthAPIClient extends BaseAPIClient {
  
  /**
   * Get authentication token
   * Priority: Backend JWT tokens first, then Supabase tokens as fallback
   */
  async getAuthToken(): Promise<{ token: string; isSupabase: boolean } | null> {
    try {
      // Check if we have a backend JWT token in localStorage first
      const backendToken = localStorage.getItem('accessToken');
      
      if (backendToken) {
        // Verify the token is not expired
        try {
          const payload = JSON.parse(atob(backendToken.split('.')[1]));
          if (payload.exp * 1000 > Date.now()) {
            console.log('🎯 AuthClient: Using backend JWT token');
            return { token: backendToken, isSupabase: false };
          }
        } catch (e) {
          // Token parsing failed, continue to Supabase auth
        }
      }

      // Fallback to Supabase auth if no backend token available
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        const supabaseToken = session.access_token;
        return { token: supabaseToken, isSupabase: true };
      } else {
        console.error('Error getting Supabase token: No session found');
        return null;
      }
    } catch (error) {
      console.error('Error in getAuthToken:', error);
      return null;
    }
  }

  /**
   * Override request method to add authentication
   * PRESERVE exact auth header logic and 401 retry behavior
   */
  protected async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const { skipAuth = false, retryCount = 0, ...restConfig } = config;

    // Add authentication headers if not skipped
    if (!skipAuth) {
      console.log('🔐 AuthClient: Getting auth token for request to:', endpoint);
      const authInfo = await this.getAuthToken();
      console.log('🔑 AuthClient: Auth info received:', authInfo ? { isSupabase: authInfo.isSupabase, tokenLength: authInfo.token.length } : 'null');
      
      if (authInfo) {
        const headers = {
          ...((restConfig.headers as Record<string, string>) || {}),
        };

        // Set appropriate auth header based on token type
        if (authInfo.isSupabase) {
          headers['Authorization'] = `Bearer ${authInfo.token}`;
          console.log('🟦 AuthClient: Using Supabase token');
        } else {
          headers['Authorization'] = `Bearer ${authInfo.token}`;
          console.log('🎯 AuthClient: Using backend JWT token');
        }

        restConfig.headers = headers;
        console.log('📤 AuthClient: Request headers prepared');
        console.log('🔍 AuthClient: Headers being sent to BaseClient:', headers);
        console.log('🔍 AuthClient: Full config being sent to BaseClient:', { ...restConfig, retryCount, skipAuth });
      } else {
        console.warn('⚠️ AuthClient: No authentication token available');
      }
    } else {
      console.log('🚫 AuthClient: Skipping authentication for:', endpoint);
    }

    try {
      return await super.request<T>(endpoint, { ...restConfig, retryCount, skipAuth });
    } catch (error) {
      // Handle 401 - Try to refresh session (PRESERVE exact retry logic)
      if (error instanceof APIError && error.status === 401 && !skipAuth && retryCount === 0) {
        // Try to refresh token using auth service
        try {
          // Import authService dynamically to avoid circular dependency
          const { authService } = await import('../../auth-service');
          const refreshed = await authService.refreshTokens();
          if (refreshed) {
            // Retry the request with new token
            return this.request<T>(endpoint, { ...config, retryCount: 1 });
          }
        } catch (refreshError) {
          // Refresh failed, clear tokens and continue with original error
          console.error('Token refresh failed:', refreshError);
        }
        throw new APIError(401, 'Unauthorized', null, 'AUTH_REQUIRED');
      }

      throw error;
    }
  }

  // Public methods that use authentication
  public async authenticatedGet<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.get<T>(endpoint, config);
  }

  public async authenticatedPost<T>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.post<T>(endpoint, data, config);
  }

  public async authenticatedPut<T>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.put<T>(endpoint, data, config);
  }

  public async authenticatedPatch<T>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.patch<T>(endpoint, data, config);
  }

  public async authenticatedDelete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.delete<T>(endpoint, config);
  }

  // Unauthenticated methods for public endpoints
  public async publicGet<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.get<T>(endpoint, { ...config, skipAuth: true });
  }

  public async publicPost<T>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.post<T>(endpoint, data, { ...config, skipAuth: true });
  }
}