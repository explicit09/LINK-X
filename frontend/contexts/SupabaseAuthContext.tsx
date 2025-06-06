/**
 * Supabase Auth Context
 * Provides auth state throughout the app
 */
import React, { createContext, useContext, ReactNode } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import type { AuthUser, AuthResponse } from '@/lib/auth/supabase-auth-service';

interface AuthContextType {
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const auth = useSupabaseAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}

// Export types and context
export { AuthContext };
export type { AuthContextType, AuthUser };