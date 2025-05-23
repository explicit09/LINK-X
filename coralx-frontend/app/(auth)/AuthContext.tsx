'use client';

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebaseconfig";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: Error | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        async (user) => {
          setUser(user);
          
          // If user is authenticated, establish session with backend
          if (user) {
            try {
              // Import dynamically to avoid circular dependencies
              const { sessionLogin } = await import('@/lib/api');
              const success = await sessionLogin();
              
              if (!success) {
                console.warn('Failed to establish backend session');
                // Don't show error to avoid spamming users, just log it
              } else {
                console.log('Backend session established successfully');
              }
            } catch (sessionError) {
              console.error('Error establishing backend session:', sessionError);
            }
          }
          
          setLoading(false);
        },
        (error) => {
          console.error('Auth state change error:', error);
          setError(error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Auth initialization error:', error);
      setError(error instanceof Error ? error : new Error('Authentication failed'));
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export { auth };