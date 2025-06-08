import { supabase } from '@/lib/supabase';

export interface UserStats {
  user_id: string;
  total_xp: number;
  current_level: number;
  current_xp: number;
  daily_streak: number;
  max_streak: number;
  weekly_goal: number;
  weekly_progress: number;
  last_activity_date: string;
  achievements_count: number;
  rank?: number;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_type: string;
  achievement_name: string;
  description: string;
  icon: string;
  earned_at: string;
}

export interface ActivityRecord {
  id: string;
  user_id: string;
  activity_type: string;
  xp_earned: number;
  description: string;
  metadata?: any;
  created_at: string;
}

class GamificationService {
  /**
   * Get user's current stats
   */
  async getUserStats(userId: string): Promise<UserStats> {
    try {
      // Get user stats
      const { data: userStats, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (statsError && statsError.code !== 'PGRST116') {
        throw statsError;
      }

      // If no stats exist, create default
      if (!userStats) {
        const { data: newStats, error: createError } = await supabase
          .from('user_stats')
          .insert({
            user_id: userId,
            current_xp: 0,
            current_level: 1,
            total_xp: 0,
            daily_streak: 0,
            max_streak: 0,
            weekly_goal: 500,
            weekly_progress: 0,
            last_activity_date: new Date().toISOString().split('T')[0]
          })
          .select()
          .single();

        if (createError) throw createError;
        return this.mapUserStats(newStats);
      }

      // Get user's rank
      const { count: rankCount } = await supabase
        .from('user_stats')
        .select('*', { count: 'exact', head: true })
        .gt('total_xp', userStats.total_xp);

      const rank = (rankCount || 0) + 1;

      // Get achievements count
      const { count: achievementsCount } = await supabase
        .from('user_achievements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      return {
        ...this.mapUserStats(userStats),
        rank,
        achievements_count: achievementsCount || 0
      };

    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Award XP to user
   */
  async awardXP(userId: string, activityType: string, xpAmount: number, description?: string, metadata?: any) {
    try {
      // Call the Supabase function to award XP
      const { data, error } = await supabase.rpc('award_xp', {
        p_user_id: userId,
        p_activity_type: activityType,
        p_xp_amount: xpAmount,
        p_description: description || `Completed ${activityType.replace('_', ' ')}`,
        p_metadata: metadata ? JSON.stringify(metadata) : null
      });

      if (error) throw error;

      // Get updated stats
      const updatedStats = await this.getUserStats(userId);
      
      // Check for new achievements
      await this.checkAndAwardAchievements(userId, updatedStats);

      return {
        xp_awarded: xpAmount,
        new_total_xp: updatedStats.total_xp,
        new_level: updatedStats.current_level,
        new_streak: updatedStats.daily_streak,
        level_up: false // TODO: Detect level up from function response
      };

    } catch (error) {
      console.error('Error awarding XP:', error);
      throw error;
    }
  }

  /**
   * Get user's achievements
   */
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Error getting achievements:', error);
      throw error;
    }
  }

  /**
   * Get user's recent activities
   */
  async getUserActivities(userId: string, limit = 50): Promise<ActivityRecord[]> {
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Error getting user activities:', error);
      throw error;
    }
  }

  /**
   * Get weekly progress data
   */
  async getWeeklyProgress(userId: string) {
    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Start of week
      
      const { data, error } = await supabase
        .from('user_activities')
        .select('created_at, xp_earned')
        .eq('user_id', userId)
        .gte('created_at', weekStart.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by day
      const dailyProgress = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        
        const dayActivities = (data || []).filter(activity => {
          const activityDate = new Date(activity.created_at);
          return activityDate.toDateString() === date.toDateString();
        });

        return {
          date: date.toISOString().split('T')[0],
          day_name: date.toLocaleDateString('en-US', { weekday: 'long' }),
          xp_earned: dayActivities.reduce((sum, activity) => sum + activity.xp_earned, 0),
          activities_count: dayActivities.length,
          is_today: date.toDateString() === today.toDateString()
        };
      });

      return dailyProgress;

    } catch (error) {
      console.error('Error getting weekly progress:', error);
      throw error;
    }
  }

  /**
   * Check and award achievements based on current stats
   */
  private async checkAndAwardAchievements(userId: string, stats: UserStats) {
    const achievementsToCheck = [
      {
        type: 'first_login',
        name: 'Welcome!',
        description: 'Completed your first login',
        icon: '👋',
        condition: () => true
      },
      {
        type: 'streak_5',
        name: 'Consistent Learner',
        description: 'Maintained a 5-day streak',
        icon: '🔥',
        condition: () => stats.daily_streak >= 5
      },
      {
        type: 'streak_10',
        name: 'Dedicated Student',
        description: 'Maintained a 10-day streak',
        icon: '⚡',
        condition: () => stats.daily_streak >= 10
      },
      {
        type: 'level_5',
        name: 'Rising Star',
        description: 'Reached level 5',
        icon: '⭐',
        condition: () => stats.current_level >= 5
      },
      {
        type: 'level_10',
        name: 'Expert Learner',
        description: 'Reached level 10',
        icon: '🏆',
        condition: () => stats.current_level >= 10
      },
      {
        type: 'xp_1000',
        name: 'Knowledge Seeker',
        description: 'Earned 1000 total XP',
        icon: '📚',
        condition: () => stats.total_xp >= 1000
      }
    ];

    for (const achievement of achievementsToCheck) {
      if (achievement.condition()) {
        // Check if already has this achievement
        const { data: existing } = await supabase
          .from('user_achievements')
          .select('id')
          .eq('user_id', userId)
          .eq('achievement_type', achievement.type)
          .single();

        if (!existing) {
          // Award the achievement
          await supabase
            .from('user_achievements')
            .insert({
              user_id: userId,
              achievement_type: achievement.type,
              achievement_name: achievement.name,
              description: achievement.description,
              icon: achievement.icon
            });
        }
      }
    }
  }

  /**
   * Map database user stats to frontend format
   */
  private mapUserStats(dbStats: any): UserStats {
    return {
      user_id: dbStats.user_id,
      total_xp: dbStats.total_xp || 0,
      current_level: dbStats.current_level || 1,
      current_xp: dbStats.current_xp || 0,
      daily_streak: dbStats.daily_streak || 0,
      max_streak: dbStats.max_streak || 0,
      weekly_goal: dbStats.weekly_goal || 500,
      weekly_progress: dbStats.weekly_progress || 0,
      last_activity_date: dbStats.last_activity_date || new Date().toISOString().split('T')[0],
      achievements_count: 0, // Will be filled by caller
      rank: undefined // Will be filled by caller
    };
  }
}

export const gamificationService = new GamificationService(); 
 