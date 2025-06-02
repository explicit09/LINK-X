import { auth } from '../../firebaseconfig';

interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
  timeout?: number;
  retryCount?: number;
  skipAuth?: boolean;
}

class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
    public code?: string,
  ) {
    super(message);
    this.name = 'APIError';
  }
}

class APIClient {
  private baseURL: string;
  private defaultTimeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    this.defaultTimeout = 30000; // 30 seconds
    this.maxRetries = 2;
    this.retryDelay = 500;
  }

  private async getAuthToken(): Promise<{ token: string; isFirebase: boolean } | null> {
    // Import authService dynamically to avoid circular dependency
    try {
      const { authService } = await import('../auth-service');
      
      // Check if user is authenticated with backend
      if (authService.isAuthenticated()) {
        const backendToken = await authService.getValidToken();
        if (backendToken && typeof backendToken === 'string') {
          // Check if this is actually a backend token by looking at authService state
          // If authService has valid tokens stored, it's a backend token
          const authState = authService['authState']; // Access private property
          if (authState?.tokens?.accessToken === backendToken) {
            return { token: backendToken, isFirebase: false };
          }
        }
      }
    } catch (error) {
      console.error('Error checking auth service:', error);
    }

    // For backward compatibility, check localStorage (will be removed)
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      console.warn(
        'Found token in localStorage - should migrate to cookie-based auth',
      );
      return { token: accessToken, isFirebase: false };
    }

    // Fallback to Firebase auth if available
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

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.maxRetries) return false;

    // Retry on network errors
    if (error instanceof TypeError && error.message.includes('network')) {
      return true;
    }

    // Retry on 5xx errors
    if (error instanceof APIError && error.status >= 500) {
      return true;
    }

    // Retry on timeout
    if (error instanceof Error && error.name === 'AbortError') {
      return true;
    }

    return false;
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {},
  ): Promise<T> {
    const {
      params,
      timeout = this.defaultTimeout,
      retryCount = 0,
      skipAuth = false,
      ...options
    } = config;

    // Build URL with params
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    // Log the request for debugging
    console.log(`API Request: ${options.method || 'GET'} ${url.toString()}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    // Get auth token unless skipped
    const authInfo = skipAuth ? null : await this.getAuthToken();

    // Determine if body is FormData
    const isFormData = options.body instanceof FormData;

    // Configure request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Add delay for retries
      if (retryCount > 0) {
        await this.sleep(this.retryDelay * retryCount);
      }

      // Build headers based on token type
      const headers: Record<string, string> = {
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      };

      if (authInfo) {
        if (authInfo.isFirebase) {
          headers['X-Firebase-Token'] = authInfo.token;
        } else {
          headers['Authorization'] = `Bearer ${authInfo.token}`;
        }
      }

      const response = await fetch(url.toString(), {
        ...options,
        headers,
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 401 - Try to refresh session
      if (response.status === 401 && !skipAuth && retryCount === 0) {
        // Try to refresh token using auth service
        try {
          // Import authService dynamically to avoid circular dependency
          const { authService } = await import('../auth-service');
          const refreshed = await authService.refreshTokens();
          if (refreshed) {
            // Retry the request with new token
            return this.request<T>(endpoint, { ...config, retryCount: 1 });
          }
        } catch (refreshError) {
          // Refresh failed, clear tokens and throw original error
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
        throw new APIError(401, 'Unauthorized', null, 'AUTH_REQUIRED');
      }

      if (!response.ok) {
        let errorData;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            errorData = await response.json();
          } else {
            errorData = { message: await response.text() };
          }
        } catch {
          errorData = { message: 'Unknown error' };
        }

        throw new APIError(
          response.status,
          errorData.message || errorData.error || 'Request failed',
          errorData,
          errorData.code,
        );
      }

      // Handle different response types
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else if (contentType?.includes('text/')) {
        return (await response.text()) as unknown as T;
      } else {
        // For blob responses (files)
        return response as unknown as T;
      }
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new APIError(
          408,
          'Request timeout',
          null,
          'TIMEOUT',
        );

        if (this.shouldRetry(timeoutError, retryCount)) {
          return this.request<T>(endpoint, {
            ...config,
            retryCount: retryCount + 1,
          });
        }
        throw timeoutError;
      }

      // Handle other errors with retry
      if (this.shouldRetry(error, retryCount)) {
        return this.request<T>(endpoint, {
          ...config,
          retryCount: retryCount + 1,
        });
      }

      throw error;
    }
  }

  // Generic HTTP methods
  get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  post<T>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  patch<T>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  // Streaming support
  async stream(
    endpoint: string,
    data: unknown,
    onMessage: (message: unknown) => void,
    onError: (error: Error) => void,
  ): Promise<() => void> {
    let isCancelled = false;

    const cleanup = () => {
      isCancelled = true;
    };

    (async () => {
      try {
        const authInfo = await this.getAuthToken();
        
        // Build headers based on token type
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (authInfo) {
          if (authInfo.isFirebase) {
            headers['X-Firebase-Token'] = authInfo.token;
          } else {
            headers['Authorization'] = `Bearer ${authInfo.token}`;
          }
        }

        const response = await fetch(`${this.baseURL}${endpoint}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new APIError(
            response.status,
            `Streaming failed: ${response.status} ${response.statusText}`,
            null,
            'STREAMING_ERROR',
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder();

        while (!isCancelled) {
          const { done, value } = await reader.read();

          if (done) break;

          if (isCancelled) {
            reader.cancel();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((line) => line.trim());

          for (const line of lines) {
            if (isCancelled) break;

            try {
              const message = JSON.parse(line);
              onMessage(message);
            } catch (e) {
              console.warn('Invalid JSON in stream:', line);
            }
          }
        }
      } catch (error) {
        if (!isCancelled) {
          onError(
            error instanceof Error
              ? error
              : new Error('Unknown streaming error'),
          );
        }
      }
    })();

    return cleanup;
  }
}

// Create singleton instance
export const apiClient = new APIClient();

// Export error class
export { APIError };
