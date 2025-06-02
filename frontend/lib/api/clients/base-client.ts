interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
  timeout?: number;
  retryCount?: number;
  skipAuth?: boolean;
}

export class APIError extends Error {
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

/**
 * BaseAPIClient - Core HTTP client functionality
 * COPIED from working api/client.ts to preserve exact functionality
 */
export class BaseAPIClient {
  protected baseURL: string;
  protected defaultTimeout: number;
  protected maxRetries: number;
  protected retryDelay: number;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    this.defaultTimeout = 30000; // 30 seconds
    this.maxRetries = 2;
    this.retryDelay = 500;
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected shouldRetry(error: unknown, attempt: number): boolean {
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

  /**
   * Core request method - PRESERVE exact logic from original client
   */
  protected async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const {
      params,
      timeout = this.defaultTimeout,
      retryCount = 0,
      skipAuth = false,
      ...options
    } = config;

    // Build URL with params
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    // Setup timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
      };

      // Remove Content-Type for FormData (browser will set it with boundary)
      if (options.body instanceof FormData) {
        delete headers['Content-Type'];
      }

      const response = await fetch(url.toString(), {
        ...options,
        headers,
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
        const jsonResponse = await response.json();
        
        // Auto-unwrap v2 API responses that have the format: {data: [...], message: "Success", status: "success"}
        // Check if this is a v2 API response by looking for the wrapper structure
        if (
          jsonResponse && 
          typeof jsonResponse === 'object' && 
          'data' in jsonResponse && 
          'status' in jsonResponse && 
          jsonResponse.status === 'success'
        ) {
          console.log('🔧 BaseClient: Detected v2 API response wrapper');
          console.log('📦 BaseClient: Raw response:', jsonResponse);
          
          // Ensure data is not null/undefined before returning
          // If data is null/undefined, return empty array for array operations
          const data = jsonResponse.data;
          console.log('📊 BaseClient: Extracted data:', data);
          console.log('📈 BaseClient: Data type:', typeof data, 'Is array:', Array.isArray(data));
          
          if (data === null || data === undefined) {
            console.warn('⚠️ BaseClient: API returned success but data is null/undefined:', jsonResponse);
            // Return empty array if this looks like a list endpoint, otherwise return null
            return (url.includes('/courses') || url.includes('/list') ? [] : null) as T;
          }
          console.log('✅ BaseClient: Returning unwrapped data');
          return data as T;
        }
        
        return jsonResponse;
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
  protected get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  protected post<T>(
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

  protected put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  protected patch<T>(
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

  protected delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

export type { RequestConfig };