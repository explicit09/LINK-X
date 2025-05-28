'use client';

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/firebaseconfig";
import { 
  login, 
  logout, 
  register, 
  getAuthState, 
  AuthState,
  userAPI 
} from "@/lib/api_v2";

interface UserProfile {
  id: string;
  email: string;
  role: string;
  profile?: {
    name?: string;
    [key: string]: any;
  };
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  authState: AuthState;
  needsRegistration: boolean;
  register: (role: string, profileData: any) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  userProfile: null,
  loading: true,
  error: null,
  authState: AuthState.UNAUTHENTICATED,
  needsRegistration: false,
  register: async () => false,
  logout: async () => {},
  refreshProfile: async () => {},
});

export const AuthProviderV2 = ({ children }: { children: React.ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [authState, setAuthState] = useState<AuthState>(AuthState.UNAUTHENTICATED);
  const [needsRegistration, setNeedsRegistration] = useState(false);

  // Fetch user profile from backend
  const fetchUserProfile = useCallback(async () => {
    try {
      const profile = await userAPI.getMe();
      setUserProfile(profile);
      setNeedsRegistration(false);
      return profile;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      if (error instanceof Error && error.message.includes('404')) {
        setNeedsRegistration(true);
      }
      throw error;
    }
  }, []);

  // Handle Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        setFirebaseUser(user);
        
        if (user) {
          try {
            // Attempt to login with backend
            const loginSuccess = await login();
            
            if (loginSuccess) {
              // Fetch user profile
              try {
                await fetchUserProfile();
                setAuthState(AuthState.AUTHENTICATED);
              } catch (profileError) {
                // User authenticated but profile not found
                setAuthState(AuthState.REGISTERING);
                setNeedsRegistration(true);
              }
            } else {
              // Check current auth state from API
              const currentState = getAuthState();
              setAuthState(currentState);
              setNeedsRegistration(currentState === AuthState.REGISTERING);
            }
          } catch (error) {
            console.error('Backend authentication error:', error);
            setError(error instanceof Error ? error : new Error('Authentication failed'));
            setAuthState(AuthState.UNAUTHENTICATED);
          }
        } else {
          // No Firebase user
          setUserProfile(null);
          setAuthState(AuthState.UNAUTHENTICATED);
          setNeedsRegistration(false);
        }
        
        setLoading(false);
      },
      (error) => {
        console.error('Firebase auth state change error:', error);
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [fetchUserProfile]);

  // Register handler
  const handleRegister = useCallback(async (role: string, profileData: any): Promise<boolean> => {
    try {
      setLoading(true);
      const success = await register(role, profileData);
      
      if (success) {
        // Fetch the newly created profile
        await fetchUserProfile();
        setAuthState(AuthState.AUTHENTICATED);
        setNeedsRegistration(false);
      }
      
      return success;
    } catch (error) {
      console.error('Registration error:', error);
      setError(error instanceof Error ? error : new Error('Registration failed'));
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile]);

  // Logout handler
  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      await logout();
      await auth.signOut();
      setUserProfile(null);
      setAuthState(AuthState.UNAUTHENTICATED);
      setNeedsRegistration(false);
    } catch (error) {
      console.error('Logout error:', error);
      setError(error instanceof Error ? error : new Error('Logout failed'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (authState === AuthState.AUTHENTICATED) {
      try {
        await fetchUserProfile();
      } catch (error) {
        console.error('Failed to refresh profile:', error);
      }
    }
  }, [authState, fetchUserProfile]);

  const value: AuthContextType = {
    firebaseUser,
    userProfile,
    loading,
    error,
    authState,
    needsRegistration,
    register: handleRegister,
    logout: handleLogout,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthV2 = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthV2 must be used within AuthProviderV2');
  }
  return context;
};

// Helper hooks for common patterns
export const useIsAuthenticated = () => {
  const { authState } = useAuthV2();
  return authState === AuthState.AUTHENTICATED;
};

export const useNeedsRegistration = () => {
  const { needsRegistration } = useAuthV2();
  return needsRegistration;
};

export const useUserRole = () => {
  const { userProfile } = useAuthV2();
  return userProfile?.role || null;
};