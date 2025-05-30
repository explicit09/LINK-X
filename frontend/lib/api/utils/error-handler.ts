/**
 * Error handling utilities for API requests
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response?: Response,
    public readonly data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public readonly originalError: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

export async function handleApiResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  
  let data: any;
  try {
    data = isJson ? await response.json() : await response.text();
  } catch (parseError) {
    data = null;
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
    throw new ApiError(message, response.status, response, data);
  }

  return data;
}

export function isRetriableError(error: any): boolean {
  // Network errors
  if (error instanceof NetworkError) {
    return true;
  }

  // API errors
  if (error instanceof ApiError) {
    // Retry on 5xx errors and 401 (auth refresh)
    return error.status >= 500 || error.status === 401;
  }

  // Timeout errors
  if (error.name === 'TimeoutError' || error.name === 'AbortError') {
    return true;
  }

  return false;
}

export function createErrorHandler() {
  return {
    handleError: (error: any) => {
      console.error('API Error:', error);
      
      if (error instanceof ApiError) {
        return {
          type: 'api',
          status: error.status,
          message: error.message,
          data: error.data
        };
      }

      if (error instanceof NetworkError) {
        return {
          type: 'network',
          message: 'Network connection failed',
          originalError: error.originalError
        };
      }

      return {
        type: 'unknown',
        message: error.message || 'An unexpected error occurred',
        error
      };
    }
  };
}