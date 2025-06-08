import { APIError } from './base-client';

/**
 * StreamingAPIClient - Handles streaming operations
 * PRESERVE exact streaming logic from original client
 */
export class StreamingAPIClient extends AuthAPIClient {

  /**
   * Start streaming session with exact logic from original client
   * PRESERVE authentication, error handling, and streaming patterns
   */
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
        // Get auth token using parent class method
        const authInfo = await this.getStreamingAuthToken();
        
        // Build headers based on token type (PRESERVE exact logic)
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (authInfo) {
          if (authInfo.isSupabase) {
            headers['Authorization'] = `Bearer ${authInfo.token}`;
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

  /**
   * Get auth token for streaming - uses parent class method via reflection
   * PRESERVE exact auth logic by calling parent's private method
   */
  private async getStreamingAuthToken(): Promise<{ token: string; isSupabase: boolean } | null> {
    // Use the parent class's private getAuthToken method via reflection
    // This preserves exact authentication logic without duplication
    return (this as any).getAuthToken();
  }

  /**
   * Get authentication headers for streaming requests
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const authInfo = await this.getStreamingAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authInfo) {
      if (authInfo.isSupabase) {
        headers['Authorization'] = `Bearer ${authInfo.token}`;
      } else {
        headers['Authorization'] = `Bearer ${authInfo.token}`;
      }
    }

    return headers;
  }
}