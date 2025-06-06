/**
 * Auth Initializer
 * Checks for existing Supabase session on app initialization
 * Prevents users from having to log in again after page refresh
 */

import { supabase } from '@/supabaseconfig';
import { authAPI } from '@/lib/api';

export interface AuthInitResult {
  isAuthenticated: boolean;
  isRegistered: boolean;
  needsOnboarding: boolean;
  user: any;
}

class AuthInitializer {
  private static instance: AuthInitializer;
  private initPromise: Promise<AuthInitResult> | null = null;
  
  private constructor() {}
  
  static getInstance(): AuthInitializer {
    if (!AuthInitializer.instance) {
      AuthInitializer.instance = new AuthInitializer();
    }
    return AuthInitializer.instance;
  }
  
  /**
   * Initialize auth state by checking for existing Supabase session
   * This is called once on app startup and cached
   */
  async initialize(): Promise<AuthInitResult> {
    // Return cached promise if initialization is already in progress
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this.performInitialization();
    return this.initPromise;
  }
  
  private async performInitialization(): Promise<AuthInitResult> {
    try {
      console.log('[AuthInitializer] Checking for existing session...');
      
      // First, check if we have a Supabase session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('[AuthInitializer] No existing session found');
        return {
          isAuthenticated: false,
          isRegistered: false,
          needsOnboarding: false,
          user: null
        };
      }
      
      console.log('[AuthInitializer] Found existing session for user:', session.user.email);
      
      // We have a session, now check registration status with backend
      try {
        const registrationCheck = await authAPI.v2.checkRegistration();
        const isRegistered = registrationCheck.isRegistered;
        const hasCompletedOnboarding = registrationCheck.has_completed_onboarding ?? true;
        
        console.log('[AuthInitializer] Registration status:', { 
          isRegistered, 
          hasCompletedOnboarding 
        });
        
        return {
          isAuthenticated: true,
          isRegistered,
          needsOnboarding: isRegistered ? !hasCompletedOnboarding : true,
          user: session.user
        };
      } catch (apiError: any) {
        console.error('[AuthInitializer] Registration check error:', apiError);
        
        // If we get a 404, user needs onboarding
        if (apiError?.status === 404 || apiError?.response?.status === 404) {
          return {
            isAuthenticated: true,
            isRegistered: false,
            needsOnboarding: true,
            user: session.user
          };
        }
        
        // For other errors, assume not registered
        return {
          isAuthenticated: true,
          isRegistered: false,
          needsOnboarding: false,
          user: session.user
        };
      }
    } catch (error) {
      console.error('[AuthInitializer] Error during initialization:', error);
      return {
        isAuthenticated: false,
        isRegistered: false,
        needsOnboarding: false,
        user: null
      };
    }
  }
  
  /**
   * Clear cached initialization (useful after logout)
   */
  reset(): void {
    this.initPromise = null;
  }
}

// Export singleton instance
export const authInitializer = AuthInitializer.getInstance();

// Export convenience function
export const initializeAuth = () => authInitializer.initialize();
export const resetAuthInitializer = () => authInitializer.reset();