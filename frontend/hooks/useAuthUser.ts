/**
 * Centralized User Authentication Hook
 * Prevents duplication and ensures consistent user data across all pages
 */

import { useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';

interface User {
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  id: string;
}

interface UseAuthUserReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAuthUser(): UseAuthUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('👤 useAuthUser: Fetching user profile...');
      
      // Single source of truth for user data
      const userData = await authAPI.v2.getProfile();
      console.log('✅ useAuthUser: User profile received:', userData);
      setUser(userData);
      
    } catch (err) {
      console.error('❌ useAuthUser: Failed to fetch user:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return {
    user,
    isLoading,
    error,
    refetch: fetchUser
  };
}

// Helper hook for just the user name (most common use case)
export function useUserName(): string {
  const { user, isLoading } = useAuthUser();
  
  if (isLoading) return 'Loading...';
  if (!user) return 'User';
  
  return user.name;
}