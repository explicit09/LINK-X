/**
 * Supabase Auth Adapter
 * Provides Firebase-like auth interface using Supabase
 */
import { supabase, getCurrentUser, signInWithGoogle, signOut, onAuthStateChange } from '@/supabaseconfig';
import { User } from '@supabase/supabase-js';

// Firebase-compatible User type
export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  getIdToken: () => Promise<string>;
}

// Convert Supabase user to Firebase-compatible user
const toFirebaseUser = (user: User | null): FirebaseUser | null => {
  if (!user) return null;
  
  return {
    uid: user.id,
    email: user.email || null,
    displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
    photoURL: user.user_metadata?.avatar_url || null,
    emailVerified: !!user.email_confirmed_at,
    getIdToken: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }
      return session.access_token;
    },
  };
};

// Firebase-compatible auth object
export const auth = {
  currentUser: null as FirebaseUser | null,
  
  // Sign in with email and password
  signInWithEmailAndPassword: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    const firebaseUser = toFirebaseUser(data.user);
    auth.currentUser = firebaseUser;
    
    return {
      user: firebaseUser,
    };
  },
  
  // Create user with email and password
  createUserWithEmailAndPassword: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    
    const firebaseUser = toFirebaseUser(data.user);
    auth.currentUser = firebaseUser;
    
    return {
      user: firebaseUser,
    };
  },
  
  // Sign out
  signOut: async () => {
    await signOut();
    auth.currentUser = null;
  },
  
  // Send password reset email
  sendPasswordResetEmail: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    
    if (error) throw error;
  },
  
  // Auth state change listener
  onAuthStateChanged: (callback: (user: FirebaseUser | null) => void) => {
    // Get initial user
    getCurrentUser().then(user => {
      const firebaseUser = toFirebaseUser(user);
      auth.currentUser = firebaseUser;
      callback(firebaseUser);
    });
    
    // Subscribe to auth changes
    const unsubscribe = onAuthStateChange((session) => {
      const firebaseUser = session?.user ? toFirebaseUser(session.user) : null;
      auth.currentUser = firebaseUser;
      callback(firebaseUser);
    });
    
    return () => {
      unsubscribe.unsubscribe();
    };
  },
};

// Google auth provider (for compatibility)
export const googleProvider = {
  providerId: 'google.com',
};

// Helper for signing in with popup (redirects to Google OAuth)
export const signInWithPopup = async (authInstance: any, provider: any) => {
  if (provider.providerId === 'google.com') {
    await signInWithGoogle();
    // Note: This will redirect, so we won't get a direct return value
    return { user: null };
  }
  throw new Error('Unsupported provider');
};

// Helper for updating user profile
export const updateProfile = async (user: FirebaseUser, data: { displayName?: string; photoURL?: string }) => {
  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: data.displayName,
      avatar_url: data.photoURL,
    },
  });
  
  if (error) throw error;
  
  // Update local user object
  if (data.displayName !== undefined) user.displayName = data.displayName;
  if (data.photoURL !== undefined) user.photoURL = data.photoURL;
};

// Re-export auth functions for compatibility
export { onAuthStateChanged } from '@/supabaseconfig';

// For analytics (stub for now)
export const analytics = null;