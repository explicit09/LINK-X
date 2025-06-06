import { User as SupabaseUser } from '@supabase/supabase-js';
import { SupabaseManager } from './auth/supabase-manager';
import { TokenManager, type AuthTokens } from './auth/token-manager';
import { UserManager, type UserProfile } from './auth/user-manager';
import { RegistrationManager, type RegistrationData } from './auth/registration-manager';

interface AuthState {
  isAuthenticated: boolean;
  isRegistered: boolean;
  tokens: AuthTokens | null;
  user: UserProfile | null;
}

/**
 * AuthService - Unified authentication service using Supabase
 * Provides a clean interface for Supabase authentication
 */
class AuthService {
  private static instance: AuthService;
  private authState: AuthState = {
    isAuthenticated: false,
    isRegistered: false,
    tokens: null,
    user: null,
  };

  // Focused service modules
  private supabase: SupabaseManager;
  private tokens: TokenManager;
  private users: UserManager;
  private registration: RegistrationManager;

  private constructor() {
    // Initialize focused modules
    this.supabase = new SupabaseManager();
    
    this.tokens = new TokenManager((tokens) => {
      this.authState.tokens = tokens;
      this.saveAuthState();
    });

    this.users = new UserManager(() => this.getValidToken());

    this.registration = new RegistrationManager(
      this.supabase,
      (state) => {
        this.authState = state;
        this.saveAuthState();
        if (state.tokens) {
          this.tokens.scheduleTokenRefresh(state.tokens);
        }
      }
    );

    // Load auth state from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.loadAuthState();
      // Clear old session data on initialization
      this.supabase.clearOldSessionData();
    }
  }

  /**
   * PRESERVE singleton pattern - components depend on this
   */
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Load auth state from localStorage
   * PRESERVE exact state persistence logic
   */
  private loadAuthState() {
    try {
      const savedState = localStorage.getItem('authState');
      if (savedState) {
        const state = JSON.parse(savedState);
        // Check if tokens are still valid
        if (state.tokens && state.tokens.expiresAt > Date.now()) {
          this.authState = state;
          if (state.tokens) {
            this.tokens.scheduleTokenRefresh(state.tokens);
          }
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

  /**
   * Save auth state to localStorage
   * PRESERVE exact state persistence logic
   */
  private saveAuthState() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('authState', JSON.stringify(this.authState));
      } catch (error) {
        console.error('Failed to save auth state:', error);
      }
    }
  }

  /**
   * Clear auth state
   * PRESERVE exact state clearing logic
   */
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
    this.tokens.clearTokenRefreshTimer();
  }

  // Public API - delegate to focused modules while preserving exact interface

  /**
   * Login with Supabase user
   * Updated from Firebase to Supabase
   */
  async login(supabaseUser: SupabaseUser): Promise<boolean> {
    return this.registration.login(supabaseUser);
  }

  /**
   * Login with Supabase access token
   * Uses the token directly for backend authentication
   */
  async loginWithSupabase(accessToken: string): Promise<boolean> {
    try {
      // Store the token
      this.authState.tokens = {
        accessToken,
        refreshToken: '', // Supabase handles refresh internally
        expiresAt: Date.now() + 3600000, // 1 hour default
      };
      this.authState.isAuthenticated = true;
      this.saveAuthState();

      // Check registration status with the backend
      const registered = await this.checkRegistrationStatus();
      return registered;
    } catch (error) {
      console.error('Supabase login failed:', error);
      this.clearAuthState();
      return false;
    }
  }

  /**
   * Get valid token with automatic refresh
   * PRESERVE exact token management
   */
  async getValidToken(): Promise<string | null> {
    return this.tokens.getValidToken(this.authState.tokens);
  }

  /**
   * Refresh tokens
   * PRESERVE exact refresh logic
   */
  async refreshTokens(): Promise<boolean> {
    const newTokens = await this.tokens.refreshTokens(this.authState.tokens);
    return newTokens !== null;
  }

  /**
   * Check registration status
   * Updated to work with Supabase authentication
   */
  async checkRegistrationStatus(): Promise<boolean> {
    // For Supabase authentication, we don't need Firebase user
    if (!this.authState.isAuthenticated) {
      return false;
    }

    // If we already know the user is registered, return true
    if (this.authState.isRegistered && this.authState.user) {
      return true;
    }

    const result = await this.users.checkRegistrationStatus();
    if (result.isRegistered && result.user) {
      this.authState.isRegistered = true;
      this.authState.user = result.user;
      this.saveAuthState();
    }
    
    return result.isRegistered;
  }

  /**
   * Force session establishment
   * Updated for Supabase
   */
  async forceSessionEstablishment(): Promise<boolean> {
    const currentUser = await this.supabase.getCurrentUser();
    if (!currentUser) {
      console.error('No Supabase user available for session establishment');
      return false;
    }

    return this.registration.forceSessionEstablishment(currentUser);
  }

  /**
   * Logout
   * Updated for Supabase
   */
  async logout() {
    try {
      // Clear old session data first
      this.supabase.clearOldSessionData();

      // Logout from backend
      const tokenForLogout = (this.authState.tokens && typeof this.authState.tokens.accessToken === 'string')
        ? this.authState.tokens.accessToken
        : null;

      if (tokenForLogout) {
        await this.users.logoutFromBackend(tokenForLogout);
      }
    } catch (error) {
      console.error('Backend logout failed:', error);
    }

    // Clear local state
    this.clearAuthState();

    // Logout from Supabase
    await this.supabase.signOut();
  }

  /**
   * Register new user
   */
  async register(registrationData: RegistrationData): Promise<boolean> {
    return this.registration.register(registrationData);
  }

  /**
   * Make authenticated request
   * PRESERVE exact request handling with retry logic
   */
  async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const response = await this.users.makeAuthenticatedRequest(url, options);

    // If 401, try to refresh token and retry once
    if (response.status === 401 && this.authState.isAuthenticated) {
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        // Retry the request with new token
        return this.users.makeAuthenticatedRequest(url, options);
      }
    }

    return response;
  }

  // Getters - preserve exact interface
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  isRegistered(): boolean {
    return this.authState.isRegistered;
  }

  getUser(): UserProfile | null {
    return this.authState.user;
  }

  hasCompletedOnboarding(): boolean {
    const user = this.authState.user;
    if (!user) return false;
    
    // For students, check the has_completed_onboarding flag
    if (user.role === 'student') {
      return user.has_completed_onboarding ?? false;
    }
    
    // For instructors and admins, assume onboarding is complete
    return true;
  }

  // Access to individual managers for advanced use cases
  getSupabaseManager(): SupabaseManager {
    return this.supabase;
  }

  getTokenManager(): TokenManager {
    return this.tokens;
  }

  getUserManager(): UserManager {
    return this.users;
  }

  getRegistrationManager(): RegistrationManager {
    return this.registration;
  }
}

// Export singleton instance to maintain compatibility
export const authService = AuthService.getInstance();
export { AuthService };
export type { AuthState, AuthTokens, UserProfile, RegistrationData };