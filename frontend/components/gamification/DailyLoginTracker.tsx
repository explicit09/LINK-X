'use client';

import { useEffect } from 'react';
// No auth needed
import { useGamification } from '@/contexts/GamificationContext';

/**
 * Component that tracks daily login XP for authenticated and registered users
 * Should be mounted once when the app loads to automatically award daily login bonus
 */
export function DailyLoginTracker() {
  const { awardXP } = useGamification();
  
  useEffect(() => {
    // Always award daily login XP in no-auth mode
    console.log('[DailyLoginTracker] Awarding daily login XP');
    
    // Award XP after a short delay to ensure everything is loaded
    const timer = setTimeout(() => {
      try {
        awardXP('DAILY_LOGIN', { timestamp: new Date().toISOString() });
      } catch (error) {
        console.error('[DailyLoginTracker] Failed to award daily login XP:', error);
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [awardXP]);

  // No visible UI - this is just a tracker component
  return null;
}