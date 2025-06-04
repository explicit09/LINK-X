import { useMemo } from 'react';
import { Trophy, Star, Zap, Flame } from 'lucide-react';
import type { CourseProgress, AchievementBadge } from '../types';

export function useAchievements(
  courseProgress: CourseProgress,
): AchievementBadge[] {
  return useMemo(() => {
    const badges: AchievementBadge[] = [];

    // Progress badges
    if (courseProgress.progressPercentage >= 25) {
      badges.push({
        icon: Trophy,
        label: 'Getting Started',
        color: 'bg-yellow-100 text-yellow-700',
        description: '25% course completion',
      });
    }

    if (courseProgress.progressPercentage >= 50) {
      badges.push({
        icon: Star,
        label: 'Half Way There',
        color: 'bg-blue-100 text-blue-700',
        description: '50% course completion',
      });
    }

    if (courseProgress.progressPercentage >= 75) {
      badges.push({
        icon: Zap,
        label: 'Almost Done',
        color: 'bg-purple-100 text-purple-700',
        description: '75% course completion',
      });
    }

    // Time-based badges
    if (courseProgress.weeklyTimeMinutes >= 120) {
      // 2+ hours this week
      badges.push({
        icon: Flame,
        label: 'Study Streak',
        color: 'bg-orange-100 text-orange-700',
        description: '2+ hours this week',
      });
    }

    return badges;
  }, [courseProgress]);
}
