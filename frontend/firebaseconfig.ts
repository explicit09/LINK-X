/**
 * Supabase Authentication Configuration
 * Provides Firebase-compatible exports for backward compatibility
 */

import { supabase, getCurrentUser, signInWithGoogle, signOut, onAuthStateChange } from '@/supabaseconfig';
import { User } from '@supabase/supabase-js';

// Create a Firebase-compatible auth object using Supabase
export const auth = {
  currentUser: null as User | null,
  
  // Firebase-compatible onAuthStateChanged
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return onAuthStateChange(callback);
  },
  
  signOut: signOut,
  
  // Get current user (async version)
  getCurrentUser: getCurrentUser,
};

// Re-export Supabase functions with Firebase-compatible names
export { signInWithGoogle, signOut, onAuthStateChange };

// Stub exports for Firebase compatibility
export const googleProvider = { providerId: 'google.com' };
export const analytics = null;

// Default export for compatibility
const app = {
  name: 'learn-x',
  options: {
    apiKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    authDomain: 'supabase.co',
    projectId: 'learn-x-supabase',
  },
};

export default app;
