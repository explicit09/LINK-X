/**
 * Supabase Auth Hook
 * Provides auth state and functions in React components
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  authService, 
  AuthUser, 
  AuthResponse,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOut as authSignOut,
  sendPasswordResetEmail,
  updateProfile,
  getAccessToken,
} from '@/lib/auth/supabase-auth-service';

interface UseSupabaseAuthReturn {
  // State
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  
  // Auth functions
  signIn: (email: string, password: string) => Promise<AuthResponse<AuthUser>>;
  signUp: (email: string, password: string, metadata?: any) => Promise<AuthResponse<AuthUser>>;
  signInWithGoogle: () => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResponse>;
  updateUserProfile: (updates: any) => Promise<AuthResponse<AuthUser>>;
  getToken: () => Promise<string | null>;
  
  // Utilities
  clearError: () => void;
  isAuthenticated: boolean;
  isStudent: boolean;
  isProfessor: boolean;
  isAdmin: boolean;
}

export function useSupabaseAuth(): UseSupabaseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  // Initialize auth state
  useEffect(() => {
    setLoading(true);
    let mounted = true;
    
    // Subscribe to auth changes
    // This will automatically wait for initialization and then provide the current user
    const unsubscribe = authService.onAuthStateChange((authUser) => {
      if (mounted) {
        console.log('[useSupabaseAuth] Auth state updated:', authUser?.email || 'no user');
        setUser(authUser);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Sign in function
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await signInWithEmail(email, password);
      
      if (response.error) {
        setError(response.error);
        return response;
      }
      
      // Redirect to dashboard after successful login
      router.push('/dashboard');
      return response;
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Sign up function
  const signUp = useCallback(async (email: string, password: string, metadata?: any) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await signUpWithEmail(email, password, metadata);
      
      if (response.error) {
        setError(response.error);
        return response;
      }
      
      // Redirect to onboarding after successful signup
      router.push('/onboarding');
      return response;
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Google sign in
  const googleSignIn = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await signInWithGoogle();
      
      if (response.error) {
        setError(response.error);
      }
      
      return response;
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      await authSignOut();
      router.push('/login');
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await sendPasswordResetEmail(email);
      
      if (response.error) {
        setError(response.error);
      }
      
      return response;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update profile
  const updateUserProfile = useCallback(async (updates: any) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await updateProfile(updates);
      
      if (response.error) {
        setError(response.error);
      }
      
      return response;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get access token
  const getToken = useCallback(async () => {
    try {
      return await getAccessToken();
    } catch (err) {
      setError(err as Error);
      return null;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed properties
  const isAuthenticated = !!user;
  const isStudent = user?.role === 'student';
  const isProfessor = user?.role === 'professor';
  const isAdmin = user?.role === 'admin';

  return {
    // State
    user,
    loading,
    error,
    
    // Auth functions
    signIn,
    signUp,
    signInWithGoogle: googleSignIn,
    signOut,
    resetPassword,
    updateUserProfile,
    getToken,
    
    // Utilities
    clearError,
    isAuthenticated,
    isStudent,
    isProfessor,
    isAdmin,
  };
}

// Export as default
export default useSupabaseAuth;