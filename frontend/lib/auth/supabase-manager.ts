import { supabase } from '@/supabaseconfig';
import { User as SupabaseUser } from '@supabase/supabase-js';

/**
 * SupabaseManager - Handles Supabase authentication integration
 */
export class SupabaseManager {
  
  /**
   * Clear old session data from different Supabase projects
   */
  clearOldSessionData(): void {
    if (typeof window === 'undefined') return;

    try {
      // Clear any old session data from different Supabase projects
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('sb-') || 
          key.includes('supabase') ||
          key.includes('auth-token')
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('✅ Cleared old Supabase session data');
    } catch (error) {
      console.error('Failed to clear old session data:', error);
    }
  }

  /**
   * Get access token from Supabase user
   */
  async getSupabaseToken(user: SupabaseUser): Promise<string | null> {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || null;
    } catch (error) {
      console.error('Failed to get Supabase token:', error);
      return null;
    }
  }

  /**
   * Get current Supabase user
   */
  async getCurrentUser(): Promise<SupabaseUser | null> {
    try {
      const { data } = await supabase.auth.getUser();
      return data.user || null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Sign out from Supabase
   */
  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
      console.log('✅ Signed out from Supabase');
    } catch (error) {
      console.error('Failed to sign out from Supabase:', error);
    }
  }

  /**
   * Sign in with Google using Supabase
   */
  async signInWithGoogle(): Promise<{ user: SupabaseUser | null; error: any }> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        throw error;
      }

      // For OAuth, we need to wait for the redirect
      // The actual user data will be available after the callback
      return { user: null, error: null };
    } catch (error) {
      console.error('Google sign-in failed:', error);
      return { user: null, error };
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('Failed to get current session:', error);
      return null;
    }
  }
} 