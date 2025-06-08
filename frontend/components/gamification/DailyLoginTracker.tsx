'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGamification } from '@/contexts/GamificationContext';

/**
 * Component that tracks daily login XP for authenticated and registered users
 * Should be mounted once when the app loads to automatically award daily login bonus
 */
export function DailyLoginTracker() {
  const { user, isAuthenticated, isRegistered, loading } = useAuth();
  const { awardXP } = useGamification();
  
  useEffect(() => {
    // Only award daily login XP when user is fully authenticated and registered
    if (user && isAuthenticated && isRegistered && !loading) {
      console.log('[DailyLoginTracker] Awarding daily login XP for authenticated user');
      
      // Award XP after a short delay to ensure everything is loaded
      const timer = setTimeout(() => {
        try {
          awardXP('DAILY_LOGIN', { timestamp: new Date().toISOString() });
        } catch (error) {
          console.error('[DailyLoginTracker] Failed to award daily login XP:', error);
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [user, isAuthenticated, isRegistered, loading, awardXP]);

  // No visible UI - this is just a tracker component
  return null;
}