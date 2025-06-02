import { auth } from '../../../firebaseconfig';
import { BaseAPIClient, APIError, type RequestConfig } from './base-client';

/**
 * AuthAPIClient - Handles authentication and adds auth headers to requests
 * COPIED from working api/client.ts to preserve exact auth logic
 */
export class AuthAPIClient extends BaseAPIClient {
  
  /**
   * Get authentication token - simplified logic to fix token type issues
   * Priority: Backend JWT tokens first, then Firebase tokens as fallback
   */
  private async getAuthToken(): Promise<{ token: string; isFirebase: boolean } | null> {
    // Import authService dynamically to avoid circular dependency
    try {
      const { authService } = await import('../../auth-service');
      
      // First, try to get backend token from authService
      if (authService.isAuthenticated()) {
        const backendToken = await authService.getValidToken();
        if (backendToken && typeof backendToken === 'string') {
          // If authService returns a token and user is authenticated, it's a backend token
          return { token: backendToken, isFirebase: false };
        }
      }
    } catch (error) {
      console.error('Error getting backend token:', error);
    }

    // Fallback to Firebase auth if no backend token available
    const user = auth.currentUser;
    if (!user) return null;

    try {
      const firebaseToken = await user.getIdToken();
      return { token: firebaseToken, isFirebase: true };
    } catch (error) {
      console.error('Error getting Firebase token:', error);
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
      const authInfo = await this.getAuthToken();
      if (authInfo) {
        const headers = {
          ...((restConfig.headers as Record<string, string>) || {}),
        };

        // Set appropriate auth header based on token type
        if (authInfo.isFirebase) {
          headers['X-Firebase-Token'] = authInfo.token;
        } else {
          headers['Authorization'] = `Bearer ${authInfo.token}`;
        }

        restConfig.headers = headers;
      }
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