import { auth } from '../firebaseconfig';
import { User as FirebaseUser } from 'firebase/auth';

// Use the API URL from environment or fallback to localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

interface AuthState {
  isAuthenticated: boolean;
  isRegistered: boolean;
  tokens: AuthTokens | null;
  user: {
    id: string;
    email: string;
    role: 'student' | 'instructor' | 'admin';
    profile?: {
      name?: string;
      university?: string;
    };
  } | null;
}

class AuthService {
  private static instance: AuthService;
  private authState: AuthState = {
    isAuthenticated: false,
    isRegistered: false,
    tokens: null,
    user: null,
  };

  private tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly TOKEN_REFRESH_MARGIN = 5 * 60 * 1000; // Refresh 5 minutes before expiry

  private constructor() {
    // Load auth state from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.loadAuthState();
      // Clear old session cookies on initialization to prevent auth issues
      this.clearOldSessionCookies();
    }
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private loadAuthState() {
    try {
      const savedState = localStorage.getItem('authState');
      if (savedState) {
        const state = JSON.parse(savedState);
        // Check if tokens are still valid
        if (state.tokens && state.tokens.expiresAt > Date.now()) {
          this.authState = state;
          this.scheduleTokenRefresh();
        } else {
          // Clear expired state
          this.clearAuthState();
        }
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
      this.clearAuthState();
    }
  }

  private saveAuthState() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('authState', JSON.stringify(this.authState));
      } catch (error) {
        console.error('Failed to save auth state:', error);
      }
    }
  }

  private clearAuthState() {
    this.authState = {
      isAuthenticated: false,
      isRegistered: false,
      tokens: null,
      user: null,
    };
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authState');
    }
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  private scheduleTokenRefresh() {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    if (!this.authState.tokens) return;

    const timeUntilExpiry = this.authState.tokens.expiresAt - Date.now();
    const refreshTime = Math.max(
      0,
      timeUntilExpiry - this.TOKEN_REFRESH_MARGIN,
    );

    this.tokenRefreshTimer = setTimeout(() => {
      this.refreshTokens();
    }, refreshTime);
  }

  async refreshTokens(): Promise<boolean> {
    try {
      // Check if we have a refresh token
      const refreshToken = this.authState.tokens?.refreshToken;
      
      if (!refreshToken && !auth.currentUser) {
        // No refresh token and no Firebase user, clear auth state
        this.clearAuthState();
        return false;
      }

      // If we have a refresh token, use it to get a new access token
      if (refreshToken) {
        try {
          const response = await fetch(`${API_URL}/api/v2/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
            credentials: 'include',
          });

          if (!response.ok) {
            console.error('Backend token refresh failed:', response.status);
            // If refresh fails, try to re-login with Firebase
            if (auth.currentUser) {
              console.log('Attempting to re-establish session with Firebase');
              const loginResult = await this.login(auth.currentUser);
              return loginResult;
            }
            this.clearAuthState();
            return false;
          }

          const data = await response.json();
          
          // Update tokens
          this.authState.tokens = {
            ...this.authState.tokens,
            accessToken: data.access_token,
            expiresAt: Date.now() + (data.expires_in || 1800) * 1000, // Default 30 minutes
          };

          this.saveAuthState();
          this.scheduleTokenRefresh();
          return true;
          
        } catch (error) {
          console.error('Token refresh request failed:', error);
          // Try to re-login with Firebase as fallback
          if (auth.currentUser) {
            const loginResult = await this.login(auth.currentUser);
            return loginResult;
          }
        }
      }
      
      // If no refresh token but we have Firebase user, try to re-establish session
      if (auth.currentUser && !refreshToken) {
        console.log('No refresh token, attempting to re-establish session with Firebase');
        const loginResult = await this.login(auth.currentUser);
        return loginResult;
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      if (!auth.currentUser) {
        this.clearAuthState();
      }
      return false;
    }
  }

  async login(firebaseUser: FirebaseUser): Promise<boolean> {
    try {
      // Get Firebase ID token
      const idToken = await firebaseUser.getIdToken();

      // Try to establish session with backend
      // Create session with Firebase token
      const response = await fetch(`${API_URL}/api/v2/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
        credentials: 'include',
      });

      if (!response.ok) {
        // If 404, user needs to complete registration
        if (response.status === 404) {
          // User needs to complete registration
          this.authState.isAuthenticated = true;
          this.authState.isRegistered = false;
          this.saveAuthState();
          return true; // Firebase auth successful, but needs registration
        }

        // For other errors, clear auth state
        console.error(`Login failed with status: ${response.status}`);
        this.clearAuthState();
        return false;
      }

      const data = await response.json();

      // Validate response structure
      if (!data) {
        console.error('Login failed: Empty response from backend');
        this.clearAuthState();
        return false;
      }

      // Update auth state - handle both v1 and v2 response formats
      const accessToken = data.tokens?.access_token || data.access_token || data.token;
      const refreshToken = data.tokens?.refresh_token;
      const expiresIn = data.tokens?.expires_in || 24 * 60 * 60;
      
      this.authState = {
        isAuthenticated: true,
        isRegistered: true, // If sessionLogin succeeds, user is registered
        tokens: {
          accessToken,
          refreshToken,
          expiresAt: Date.now() + expiresIn * 1000,
        },
        user: data.user || null,
      };

      this.saveAuthState();
      this.scheduleTokenRefresh();

      // Safe logging with null check
      if (data.user && data.user.email) {
        // User successfully authenticated and registered
      } else {
        // User successfully authenticated and registered
      }

      return true;
    } catch (error) {
      console.error('Login failed:', error);
      this.clearAuthState();
      return false;
    }
  }

  async checkRegistrationStatus(): Promise<boolean> {
    if (!auth.currentUser || !this.authState.isAuthenticated) {
      return false;
    }

    // If we already know the user is registered, return true
    if (this.authState.isRegistered && this.authState.user) {
      return true;
    }

    try {
      const token = await this.getValidToken();
      if (!token) return false;

      const response = await fetch(`${API_URL}/api/v2/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        mode: 'cors',
      });

      if (response.ok) {
        const userData = await response.json();
        this.authState.isRegistered = true;
        this.authState.user = userData;
        this.saveAuthState();
        return true;
      }

      // If 401, the session might not be established properly
      if (response.status === 401) {
        // Registration check got 401, session may need refresh
      }

      return false;
    } catch (error) {
      console.error('Registration check failed:', error);
      return false;
    }
  }

  async getValidToken(): Promise<string | null> {
    // Use stored JWT token from backend if available
    if (this.authState.tokens && this.authState.tokens.expiresAt > Date.now()) {
      return this.authState.tokens.accessToken;
    }

    // If no backend token but we have a Firebase user, try to establish session
    if (auth.currentUser && !this.authState.tokens) {
      // No backend token found, attempting to establish session
      // console.log('getValidToken: No local backend token, attempting login to establish session.');
      const sessionEstablished = await this.login(auth.currentUser); // this.login updates this.authState

      // After this.login(), this.authState.tokens should be populated if login was successful
      // and resulted in tokens.
      if (sessionEstablished && this.authState.tokens && typeof this.authState.tokens.accessToken === 'string') {
        // console.log('getValidToken: Session established, returning new backend accessToken.');
        return this.authState.tokens.accessToken;
      }
      // console.log('getValidToken: Session establishment did not result in a usable token.');
    }

    // Fall back to Firebase token only if no backend token
    if (auth.currentUser) {
      try {
        const firebaseToken = await auth.currentUser.getIdToken();
        // Using Firebase token as fallback
        return firebaseToken;
      } catch (error) {
        console.error('Failed to get Firebase token:', error);
      }
    }

    return null;
  }

  // Force session establishment - useful for fixing auth issues
  async forceSessionEstablishment(): Promise<boolean> {
    if (!auth.currentUser) {
      console.error('No Firebase user available for session establishment');
      return false;
    }

    // Force session establishment
    this.clearAuthState(); // Clear any stale state
    return await this.login(auth.currentUser);
  }

  private clearOldSessionCookies() {
    // Clear any old session cookies from different Firebase projects
    document.cookie.split(';').forEach((cookie) => {
      const eqPos = cookie.indexOf('=');
      const name =
        eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      if (name === 'session') {
        // Clear the cookie by setting it with an expired date
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
      }
    });
  }

  async logout() {
    try {
      // Clear old session cookies first
      this.clearOldSessionCookies();

      // Logout from backend
      const tokenForLogout = (this.authState.tokens && typeof this.authState.tokens.accessToken === 'string')
        ? this.authState.tokens.accessToken
        : null;

      if (tokenForLogout) {
        // console.log('Logout: Attempting backend logout with token');
        await fetch(`${API_URL}/api/v2/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenForLogout}`,
          },
          credentials: 'include',
        });
      } else {
        // console.log('Logout: No valid token for backend logout');
      }
    } catch (error) {
      console.error('Backend logout failed:', error);
    }

    // Clear local state
    // console.log('Logout: Clearing local auth state');
    this.clearAuthState();

    // Logout from Firebase
    // console.log('Logout: Signing out from Firebase');
    await auth.signOut();
    // console.log('Logout: Completed');
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  isRegistered(): boolean {
    return this.authState.isRegistered;
  }

  getUser(): {
    id: string;
    email: string;
    role: 'student' | 'instructor' | 'admin';
    profile?: {
      name?: string;
      university?: string;
    };
  } | null {
    return this.authState.user;
  }

  async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const token = await this.getValidToken();

    if (!token) {
      throw new Error('No valid authentication token');
    }

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    // If 401, try to refresh token and retry once
    if (response.status === 401 && this.authState.isAuthenticated) {
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        const newToken = await this.getValidToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          return fetch(url, {
            ...options,
            headers,
            credentials: 'include',
          });
        }
      }
    }

    return response;
  }
}

export const authService = AuthService.getInstance();
