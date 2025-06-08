import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jfutbxgkplrkyyucxhjn.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdXRieGdrcGxya3l5dWN4aGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNjAxMDgsImV4cCI6MjA2NDkzNjEwOH0.zgYKW0X_-OJ_XBcuMVsXZRSkdIJ-gMIAnKgJe0AszwM';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Singleton instance - prevents multiple client creation
let supabaseInstance: SupabaseClient | null = null;

// Create a single Supabase client for interacting with your database
export const supabase = (() => {
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          storageKey: 'sb-jfutbxgkplrkyyucxhjn-auth-token', // Use Supabase default key format
          flowType: 'implicit', // Use implicit flow for OAuth
        },
        global: {
          headers: {
            'x-client-info': 'learn-x-frontend@1.0.0',
          },
        },
      });
      
      if (typeof window !== 'undefined') {
        console.log('[Supabase] Client initialized successfully');
      }
    } catch (error) {
      console.error('[Supabase] Failed to initialize client:', error);
      throw error;
    }
  }
  return supabaseInstance;
})();

// Helper function to get current user
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }
    return user;
  } catch (error) {
    console.error('Unexpected error getting current user:', error);
    return null;
  }
};

// Helper function for Google OAuth
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: false,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    
    if (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error during Google sign in:', error);
    throw error;
  }
};

// Helper function to sign out
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  } catch (error) {
    console.error('Unexpected error during sign out:', error);
    throw error;
  }
};

// Auth state change listener
export const onAuthStateChange = (callback: (session: any) => void) => {
  try {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (typeof window !== 'undefined') {
        console.log(`[Supabase] Auth event: ${event}`);
      }
      callback(session);
    });
    
    return subscription;
  } catch (error) {
    console.error('Error setting up auth state listener:', error);
    throw error;
  }
};

// Export types
export type { SupabaseClient };

export default supabase;