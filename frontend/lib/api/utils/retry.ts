/**
 * Retry utility for API requests
 */

export interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

export class RetryError extends Error {
  constructor(message: string, public readonly lastError: Error, public readonly attempts: number) {
    super(message);
    this.name = 'RetryError';
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 2,
    baseDelay = 500,
    maxDelay = 5000,
    backoffFactor = 2
  } = config;

  let lastError: Error;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      if (attempt > 0) {
        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      return await operation();
    } catch (error) {
      lastError = error as Error;
      attempt++;
      
      // Don't retry on certain errors
      if (error instanceof Error) {
        // Don't retry on 4xx errors (except 401)
        if ('status' in error && typeof error.status === 'number') {
          if (error.status >= 400 && error.status < 500 && error.status !== 401) {
            throw error;
          }
        }
      }
    }
  }

  throw new RetryError(
    `Operation failed after ${attempt} attempts`,
    lastError!,
    attempt
  );
}