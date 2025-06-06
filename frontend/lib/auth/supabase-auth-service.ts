/**
 * Supabase Authentication Service
 * Centralized auth service with reusable functions
 */
import { supabase } from '@/supabaseconfig';
import { User, Session, AuthError } from '@supabase/supabase-js';

// Types
export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  role?: 'student' | 'professor' | 'admin';
  metadata?: Record<string, any>;
}

export interface AuthResponse<T = any> {
  data?: T;
  error?: AuthError | Error;
}

export type AuthCallback = (user: AuthUser | null) => void;

class SupabaseAuthService {
  private listeners: Set<AuthCallback>;
  private currentUser: AuthUser | null;
  private initializationPromise: Promise<void> | null;
  private isInitialized: boolean;

  constructor() {
    // Initialize properties first
    this.listeners = new Set<AuthCallback>();
    this.currentUser = null;
    this.isInitialized = false;
    this.initializationPromise = null;
    
    // Then initialize auth
    this.initializationPromise = this.initializeAuth();
  }

  /**
   * Initialize auth and set up listeners
   */
  private async initializeAuth() {
    console.log('[SupabaseAuthService] Initializing auth service');
    try {
      // IMPORTANT: Wait for Supabase to restore session from localStorage
      // This is crucial to avoid race conditions on page refresh
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('[SupabaseAuthService] Initial session restored:', session ? 'exists' : 'none', error);
      
      if (error) {
        console.error('[SupabaseAuthService] Error getting session:', error);
      }
      
      this.updateCurrentUser(session?.user || null);
      this.isInitialized = true;
      
      // Notify listeners with initial state AFTER session is restored
      this.notifyListeners();

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[SupabaseAuthService] Auth state change event:', event);
        
        // For INITIAL_SESSION event, we've already handled it above
        if (event === 'INITIAL_SESSION') {
          return;
        }
        
        this.updateCurrentUser(session?.user || null);
        this.notifyListeners();
      });
    } catch (error) {
      console.error('[SupabaseAuthService] Error during initialization:', error);
      this.isInitialized = true;
      // Still notify listeners even on error so loading state is cleared
      this.notifyListeners();
    }
  }

  /**
   * Ensure the service is initialized before performing operations
   */
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  /**
   * Convert Supabase user to our AuthUser format
   */
  private toAuthUser(user: User | null): AuthUser | null {
    if (!user) return null;

    return {
      id: user.id,
      email: user.email || null,
      displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
      avatarUrl: user.user_metadata?.avatar_url || null,
      emailVerified: !!user.email_confirmed_at,
      role: user.user_metadata?.role || 'student',
      metadata: user.user_metadata || {},
    };
  }

  /**
   * Update current user and notify listeners
   */
  private updateCurrentUser(user: User | null) {
    this.currentUser = this.toAuthUser(user);
  }

  /**
   * Notify all auth state listeners
   */
  private notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentUser);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    // Ensure initialization is complete before accessing user
    await this.ensureInitialized();
    
    // First try to return cached user for immediate response
    if (this.currentUser) {
      return this.currentUser;
    }
    
    // Otherwise fetch from Supabase
    const { data: { user } } = await supabase.auth.getUser();
    return this.toAuthUser(user);
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    // Ensure initialization is complete
    await this.ensureInitialized();
    
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  /**
   * Get access token for API calls
   */
  async getAccessToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.access_token || null;
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string): Promise<AuthResponse<AuthUser>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const authUser = this.toAuthUser(data.user);
      return { data: authUser };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * Sign up with email and password
   */
  async signUpWithEmail(
    email: string, 
    password: string, 
    metadata?: { full_name?: string; role?: string }
  ): Promise<AuthResponse<AuthUser>> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) throw error;

      const authUser = this.toAuthUser(data.user);
      return { data: authUser };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      return { data };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      this.currentUser = null;
      this.notifyListeners();
      
      return { data: true };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;
      return { data: true };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return { data: true };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: {
    displayName?: string;
    avatarUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<AuthResponse<AuthUser>> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: updates.displayName,
          avatar_url: updates.avatarUrl,
          ...updates.metadata,
        },
      });

      if (error) throw error;

      const authUser = this.toAuthUser(data.user);
      this.updateCurrentUser(data.user);
      this.notifyListeners();

      return { data: authUser };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: AuthCallback): () => void {
    this.listeners.add(callback);
    
    // If already initialized, call immediately with current state
    if (this.isInitialized) {
      callback(this.currentUser);
    } else {
      // Wait for initialization then call with current state
      this.initializationPromise?.then(() => {
        callback(this.currentUser);
      }).catch(error => {
        console.error('[SupabaseAuthService] Error in deferred callback:', error);
        callback(null);
      });
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Verify email with OTP
   */
  async verifyOtp(email: string, token: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });

      if (error) throw error;
      return { data: true };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * Refresh session
   */
  async refreshSession(): Promise<AuthResponse<Session>> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return { data: data.session };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(): Promise<AuthResponse<AuthUser>> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;

      const authUser = this.toAuthUser(user);
      return { data: authUser };
    } catch (error) {
      return { error: error as AuthError };
    }
  }
}

// Export singleton instance
export const authService = new SupabaseAuthService();

// Export convenience functions - bind them to the instance
export const getCurrentUser = authService.getCurrentUser.bind(authService);
export const getSession = authService.getSession.bind(authService);
export const getAccessToken = authService.getAccessToken.bind(authService);
export const signInWithEmail = authService.signInWithEmail.bind(authService);
export const signUpWithEmail = authService.signUpWithEmail.bind(authService);
export const signInWithGoogle = authService.signInWithGoogle.bind(authService);
export const signOut = authService.signOut.bind(authService);
export const sendPasswordResetEmail = authService.sendPasswordResetEmail.bind(authService);
export const updatePassword = authService.updatePassword.bind(authService);
export const updateProfile = authService.updateProfile.bind(authService);
export const onAuthStateChange = authService.onAuthStateChange.bind(authService);
export const verifyOtp = authService.verifyOtp.bind(authService);
export const refreshSession = authService.refreshSession.bind(authService);
export const handleOAuthCallback = authService.handleOAuthCallback.bind(authService);

// Default export
export default authService;