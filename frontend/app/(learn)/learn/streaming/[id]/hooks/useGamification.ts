import { useState, useEffect, useCallback } from 'react';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export function useGamification(completedSections: number, totalSections: number) {
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showXPAnimation, setShowXPAnimation] = useState(false);
  const [lastXPGain, setLastXPGain] = useState(0);

  const xpPerSection = 100;
  const xpForLevel = useCallback((level: number) => level * 500, []);
  
  const currentLevelXP = userXP % xpForLevel(userLevel);
  const levelProgress = (currentLevelXP / xpForLevel(userLevel)) * 100;

  // Initialize achievements
  useEffect(() => {
    const initialAchievements: Achievement[] = [
      {
        id: 'first_section',
        name: 'Getting Started',
        description: 'Complete your first section',
        icon: '🎯',
        unlocked: false
      },
      {
        id: 'five_sections',
        name: 'Making Progress',
        description: 'Complete 5 sections',
        icon: '🚀',
        unlocked: false
      },
      {
        id: 'speed_reader',
        name: 'Speed Reader',
        description: 'Complete 3 sections in 10 minutes',
        icon: '⚡',
        unlocked: false
      },
      {
        id: 'completionist',
        name: 'Completionist',
        description: 'Complete all sections in a document',
        icon: '🏆',
        unlocked: false
      },
      {
        id: 'streak_master',
        name: 'Streak Master',
        description: 'Maintain a 7-day learning streak',
        icon: '🔥',
        unlocked: false
      }
    ];
    setAchievements(initialAchievements);
  }, []);

  // Award XP for completed sections
  const awardXP = useCallback((amount: number = xpPerSection) => {
    setLastXPGain(amount);
    setUserXP(prev => {
      const newXP = prev + amount;
      const newLevel = Math.floor(newXP / xpForLevel(userLevel)) + 1;
      
      if (newLevel > userLevel) {
        setUserLevel(newLevel);
        setShowXPAnimation(true);
        setTimeout(() => setShowXPAnimation(false), 2000);
      }
      
      return newXP;
    });
    
    setShowXPAnimation(true);
    setTimeout(() => setShowXPAnimation(false), 1500);
  }, [userLevel, xpForLevel, xpPerSection]);

  // Check for achievement unlocks
  useEffect(() => {
    setAchievements(prev => prev.map(achievement => {
      if (achievement.unlocked) return achievement;

      let shouldUnlock = false;
      
      switch (achievement.id) {
        case 'first_section':
          shouldUnlock = completedSections >= 1;
          break;
        case 'five_sections':
          shouldUnlock = completedSections >= 5;
          break;
        case 'completionist':
          shouldUnlock = totalSections > 0 && completedSections >= totalSections;
          break;
        case 'speed_reader':
          // This would need additional timing logic in the parent component
          shouldUnlock = false;
          break;
        case 'streak_master':
          shouldUnlock = streak >= 7;
          break;
      }

      if (shouldUnlock && !achievement.unlocked) {
        // Award bonus XP for achievement
        setTimeout(() => awardXP(200), 500);
        return { ...achievement, unlocked: true };
      }
      
      return achievement;
    }));
  }, [completedSections, totalSections, streak, awardXP]);

  // Award XP when sections are completed
  useEffect(() => {
    if (completedSections > 0) {
      // Only award XP for new completions
      const previousCompletions = userXP / xpPerSection;
      if (completedSections > previousCompletions) {
        awardXP();
      }
    }
  }, [completedSections, awardXP, userXP, xpPerSection]);

  const updateStreak = useCallback((increment: boolean = true) => {
    setStreak(prev => increment ? prev + 1 : 0);
  }, []);

  const getRecentAchievements = useCallback(() => {
    return achievements.filter(a => a.unlocked).slice(-3);
  }, [achievements]);

  const getNextLevelXP = useCallback(() => {
    return xpForLevel(userLevel) - currentLevelXP;
  }, [userLevel, currentLevelXP, xpForLevel]);

  return {
    userXP,
    userLevel,
    streak,
    achievements,
    showXPAnimation,
    lastXPGain,
    currentLevelXP,
    levelProgress,
    awardXP,
    updateStreak,
    getRecentAchievements,
    getNextLevelXP
  };
}