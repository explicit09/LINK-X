/**
 * Network retry utility for handling temporary connection issues
 */

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoff?: boolean;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoff = true
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message === 'Load failed') {
        console.warn(`Network error on attempt ${attempt + 1}/${maxRetries}. Retrying...`);
        
        // Don't retry on the last attempt
        if (attempt < maxRetries - 1) {
          const delay = backoff ? retryDelay * Math.pow(2, attempt) : retryDelay;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // For non-network errors, throw immediately
      throw error;
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Check if backend is reachable
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8080/health', {
      method: 'GET',
      mode: 'cors'
    });
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}