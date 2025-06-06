import { supabase } from '../../supabaseconfig';

// Use the API URL from environment or fallback to localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

/**
 * TokenManager - Handles token management and refresh logic
 * COPIED from working auth-service.ts to preserve exact functionality
 */
export class TokenManager {
  private tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly TOKEN_REFRESH_MARGIN = 5 * 60 * 1000; // Refresh 5 minutes before expiry

  constructor(
    private onTokensUpdated: (tokens: AuthTokens | null) => void
  ) {}

  /**
   * Get valid token, refreshing if needed
   * PRESERVE exact token validation and refresh logic from auth-service
   */
  async getValidToken(currentTokens: AuthTokens | null): Promise<string | null> {
    if (!currentTokens) {
      // No tokens, try to get Supabase session token as fallback
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Failed to get Supabase session:', error);
          return null;
        }
        if (session?.access_token) {
          return session.access_token;
        }
      } catch (error: any) {
        console.error('Failed to get Supabase token:', error);
        return null;
      }
      return null;
    }

    // Check if token is still valid
    const now = Date.now();
    const timeUntilExpiry = currentTokens.expiresAt - now;

    // If token expires in less than 5 minutes, refresh it
    if (timeUntilExpiry < this.TOKEN_REFRESH_MARGIN) {
      try {
        const refreshed = await this.refreshTokens(currentTokens);
        return refreshed?.accessToken || null;
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Fallback to Supabase session token
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            console.error('Supabase session fallback failed:', sessionError);
            return null;
          }
          if (session?.access_token) {
            return session.access_token;
          }
        } catch (supabaseError) {
          console.error('Supabase token fallback failed:', supabaseError);
        }
        return null;
      }
    }

    return currentTokens.accessToken;
  }

  /**
   * Refresh tokens using refresh token or Firebase
   * PRESERVE exact refresh logic from auth-service
   */
  async refreshTokens(currentTokens: AuthTokens | null): Promise<AuthTokens | null> {
    try {
      // Try refresh token first
      if (currentTokens?.refreshToken) {
        const response = await fetch(`${API_URL}/api/v2/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: currentTokens.refreshToken }),
        });

        if (response.ok) {
          const responseData = await response.json();
          // Handle v2 API response format where data is wrapped in a 'data' field
          const data = responseData.data || responseData;
          const newTokens: AuthTokens = {
            accessToken: data.tokens?.access_token || data.access_token || data.token,
            refreshToken: data.tokens?.refresh_token || data.refresh_token || currentTokens.refreshToken,
            expiresAt: Date.now() + (data.tokens?.expires_in || data.expires_in || 24 * 60 * 60) * 1000,
          };
          
          this.onTokensUpdated(newTokens);
          this.scheduleTokenRefresh(newTokens);
          return newTokens;
        }
      }

      // Fallback to Supabase session refresh
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.access_token) {
          // Use the Supabase access token directly - no need to exchange
          const newTokens: AuthTokens = {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour default
          };
          
          this.onTokensUpdated(newTokens);
          this.scheduleTokenRefresh(newTokens);
          return newTokens;
        }
      } catch (supabaseError) {
        console.error('Supabase session refresh failed:', supabaseError);
      }
      
      // If we have a session but no backend tokens, we might be in a mixed state
      // Try to establish backend session with Supabase token
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session?.access_token) {
          const response = await fetch(`${API_URL}/api/v2/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken: session.access_token }),
          });

          if (response.ok) {
            const responseData = await response.json();
            // Handle v2 API response format where data is wrapped in a 'data' field
            const data = responseData.data || responseData;
            const newTokens: AuthTokens = {
              accessToken: data.tokens?.access_token || data.access_token || data.token,
              refreshToken: data.tokens?.refresh_token,
              expiresAt: Date.now() + (data.tokens?.expires_in || 24 * 60 * 60) * 1000,
            };
            
            this.onTokensUpdated(newTokens);
            this.scheduleTokenRefresh(newTokens);
            return newTokens;
          }
        }
      } catch (backendError) {
        console.error('Backend token exchange failed:', backendError);
      }

      // If all refresh attempts fail, clear tokens
      this.onTokensUpdated(null);
      this.clearTokenRefreshTimer();
      return null;

    } catch (error) {
      console.error('Token refresh failed:', error);
      this.onTokensUpdated(null);
      this.clearTokenRefreshTimer();
      return null;
    }
  }

  /**
   * Schedule token refresh before expiry
   * PRESERVE exact scheduling logic from auth-service
   */
  scheduleTokenRefresh(tokens: AuthTokens) {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    const timeUntilRefresh = tokens.expiresAt - Date.now() - this.TOKEN_REFRESH_MARGIN;
    
    if (timeUntilRefresh > 0) {
      this.tokenRefreshTimer = setTimeout(async () => {
        await this.refreshTokens(tokens);
      }, timeUntilRefresh);
    } else {
      // Token expires soon, refresh immediately
      setTimeout(async () => {
        await this.refreshTokens(tokens);
      }, 100);
    }
  }

  /**
   * Clear token refresh timer
   */
  clearTokenRefreshTimer() {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  /**
   * Create authenticated request headers
   */
  async createAuthHeaders(currentTokens: AuthTokens | null): Promise<Record<string, string>> {
    const token = await this.getValidToken(currentTokens);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }
}