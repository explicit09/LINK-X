import { auth } from '@/firebaseconfig';
import { User as FirebaseUser } from 'firebase/auth';

// Use the API URL from environment or fallback to localhost
const API_URL = 'http://localhost:8080';

interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

interface AuthState {
  isAuthenticated: boolean;
  isRegistered: boolean;
  tokens: AuthTokens | null;
  user: any | null;
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
    const refreshTime = Math.max(0, timeUntilExpiry - this.TOKEN_REFRESH_MARGIN);

    this.tokenRefreshTimer = setTimeout(() => {
      this.refreshTokens();
    }, refreshTime);
  }

  async refreshTokens(): Promise<boolean> {
    try {
      if (!auth.currentUser) {
        this.clearAuthState();
        return false;
      }

      // Get fresh Firebase token
      const firebaseToken = await auth.currentUser.getIdToken(true);
      
      // For now, just update the token expiry since we're using Firebase tokens
      // In a production system, you'd exchange for backend tokens
      this.authState.tokens = {
        accessToken: firebaseToken,
        expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
      };
      
      this.saveAuthState();
      this.scheduleTokenRefresh();
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Don't clear auth state on refresh failure if user is still logged in
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
      console.log('Creating session with Firebase token...');
      const response = await fetch(`${API_URL}/api/v1/auth/sessionLogin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
        credentials: 'include',
      });
      console.log('Session login response:', response.status);

      if (!response.ok) {
        // If 404, user needs to complete registration
        if (response.status === 404) {
          console.log('User needs to complete registration');
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
      
      // Update auth state
      this.authState = {
        isAuthenticated: true,
        isRegistered: true, // If sessionLogin succeeds, user is registered
        tokens: {
          accessToken: data.access_token || data.token, // v1 returns 'token', v2 returns 'access_token'
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        },
        user: data.user || null,
      };
      
      this.saveAuthState();
      this.scheduleTokenRefresh();
      
      // Safe logging with null check
      if (data.user && data.user.email) {
        console.log('User successfully authenticated and registered:', data.user.email);
      } else {
        console.log('User successfully authenticated and registered');
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

      const response = await fetch(`${API_URL}/api/v1/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
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
        console.log('Registration check got 401, session may need refresh');
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

    // Fall back to Firebase token only if no backend token
    if (auth.currentUser) {
      try {
        const firebaseToken = await auth.currentUser.getIdToken();
        return firebaseToken;
      } catch (error) {
        console.error('Failed to get Firebase token:', error);
      }
    }

    return null;
  }

  private clearOldSessionCookies() {
    // Clear any old session cookies from different Firebase projects
    document.cookie.split(';').forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
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
      if (this.authState.tokens) {
        await fetch(`${API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authState.tokens.accessToken}`,
          },
          credentials: 'include',
        });
      }
    } catch (error) {
      console.error('Backend logout failed:', error);
    }

    // Clear local state
    this.clearAuthState();
    
    // Logout from Firebase
    await auth.signOut();
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  isRegistered(): boolean {
    return this.authState.isRegistered;
  }

  getUser(): any | null {
    return this.authState.user;
  }

  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getValidToken();
    
    if (!token) {
      throw new Error('No valid authentication token');
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
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