import { auth } from '@/firebaseconfig';

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
    public data?: any,
    public code?: string
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

  private async getAuthToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private shouldRetry(error: any, attempt: number): boolean {
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
    if (error.name === 'AbortError') {
      return true;
    }
    
    return false;
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
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
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    // Get auth token unless skipped
    const token = skipAuth ? null : await this.getAuthToken();

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

      const response = await fetch(url.toString(), {
        ...options,
        headers: {
          ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 401 - Try to refresh session
      if (response.status === 401 && !skipAuth) {
        // Implement session refresh logic here
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
          errorData.code
        );
      }

      // Handle different response types
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else if (contentType?.includes('text/')) {
        return await response.text() as unknown as T;
      } else {
        // For blob responses (files)
        return response as unknown as T;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new APIError(408, 'Request timeout', null, 'TIMEOUT');
        
        if (this.shouldRetry(timeoutError, retryCount)) {
          return this.request<T>(endpoint, { ...config, retryCount: retryCount + 1 });
        }
        throw timeoutError;
      }
      
      // Handle other errors with retry
      if (this.shouldRetry(error, retryCount)) {
        return this.request<T>(endpoint, { ...config, retryCount: retryCount + 1 });
      }
      
      throw error;
    }
  }

  // Generic HTTP methods
  get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  patch<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

// Create singleton instance
export const apiClient = new APIClient();

// Export error class
export { APIError };