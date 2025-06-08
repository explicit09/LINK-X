import { supabase } from '@/lib/supabase';

export interface AnalyticsOverview {
  this_week_activities: number;
  this_week_avg_duration: number;
  this_week_engagement: number;
  monthly_activities: number;
  avg_completion_rate: number;
  avg_engagement_score: number;
  current_xp: number;
  current_level: number;
  daily_streak: number;
}

export interface StudyInsights {
  avg_session_length: number;
  avg_effectiveness: number;
  avg_focus_score: number;
  completed_sessions: number;
  missed_sessions: number;
  total_xp_earned: number;
}

export interface ContentPerformance {
  file_id: string;
  title: string;
  avg_completion: number;
  avg_duration: number;
  access_count: number;
  last_accessed: string;
}

export interface EngagementTrend {
  date: string;
  avg_engagement: number;
  session_count: number;
  avg_time_on_content: number;
}

export class AnalyticsService {
  /**
   * Get comprehensive analytics overview for a user
   */
  static async getUserAnalytics(daysBack: number = 30) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    // Get user activities
    const { data: userActivities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString());

    if (activitiesError) throw activitiesError;

    // Get study sessions
    const { data: studySessions, error: sessionsError } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString());

    if (sessionsError) throw sessionsError;

    // Get session analytics
    const { data: sessionAnalytics, error: analyticsError } = await supabase
      .from('session_analytics')
      .select('*')
      .eq('user_id', user.id)
      .gte('event_timestamp', startDate.toISOString());

    if (analyticsError) throw analyticsError;

    return {
      userActivities: userActivities || [],
      studySessions: studySessions || [],
      sessionAnalytics: sessionAnalytics || [],
      weekStart
    };
  }

  /**
   * Calculate overview metrics from raw data
   */
  static calculateOverview(data: any, weekStart: Date): AnalyticsOverview {
    const { userActivities, studySessions } = data;
    
    const weekActivities = userActivities.filter((a: any) => 
      new Date(a.created_at) >= weekStart
    );
    
    const completedSessions = studySessions.filter((s: any) => s.status === 'completed');
    
    const totalXP = userActivities.reduce((sum: number, activity: any) => 
      sum + (activity.xp_earned || 0), 0
    );
    
    const avgDuration = completedSessions.length > 0 
      ? completedSessions.reduce((sum: number, s: any) => sum + (s.actual_duration_minutes || 0), 0) / completedSessions.length
      : 0;
    
    const avgEffectiveness = completedSessions.length > 0
      ? completedSessions.reduce((sum: number, s: any) => sum + (s.effectiveness_rating || 0), 0) / completedSessions.length
      : 0;

    return {
      this_week_activities: weekActivities.length,
      this_week_avg_duration: avgDuration,
      this_week_engagement: avgEffectiveness / 5, // Convert 1-5 scale to 0-1
      monthly_activities: userActivities.length,
      avg_completion_rate: 85, // TODO: Calculate from actual completions
      avg_engagement_score: avgEffectiveness / 5,
      current_xp: totalXP,
      current_level: Math.floor(totalXP / 100) + 1,
      daily_streak: Math.min(weekActivities.length, 7)
    };
  }

  /**
   * Calculate study insights from session data
   */
  static calculateStudyInsights(studySessions: any[]): StudyInsights {
    const completedSessions = studySessions.filter(s => s.status === 'completed');
    const missedSessions = studySessions.filter(s => s.status === 'missed');
    
    const avgDuration = completedSessions.length > 0 
      ? completedSessions.reduce((sum, s) => sum + (s.actual_duration_minutes || 0), 0) / completedSessions.length
      : 0;
    
    const avgEffectiveness = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.effectiveness_rating || 0), 0) / completedSessions.length
      : 0;
    
    const avgFocusScore = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.focus_score || 0), 0) / completedSessions.length
      : 0;

    return {
      avg_session_length: avgDuration,
      avg_effectiveness: avgEffectiveness,
      avg_focus_score: avgFocusScore,
      completed_sessions: completedSessions.length,
      missed_sessions: missedSessions.length,
      total_xp_earned: completedSessions.reduce((sum, s) => sum + (s.xp_earned || 0), 0)
    };
  }

  /**
   * Generate engagement trends from analytics data
   */
  static generateEngagementTrends(sessionAnalytics: any[], avgDuration: number): EngagementTrend[] {
    const trends = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayAnalytics = sessionAnalytics.filter(sa => 
        sa.event_timestamp?.startsWith(dateStr)
      );
      
      trends.push({
        date: dateStr,
        avg_engagement: dayAnalytics.length > 0 ? 0.75 : 0.5, // Placeholder calculation
        session_count: dayAnalytics.length,
        avg_time_on_content: avgDuration
      });
    }
    
    return trends;
  }

  /**
   * Get content performance from user activities
   */
  static async getContentPerformance(daysBack: number = 30): Promise<ContentPerformance[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const { data: contentActivities, error } = await supabase
      .from('user_activities')
      .select('*, activity_metadata')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .not('activity_metadata->file_id', 'is', null);

    if (error) throw error;

    // Process content performance
    const contentPerformanceMap = new Map();
    contentActivities?.forEach(activity => {
      const fileId = activity.activity_metadata?.file_id;
      if (fileId) {
        if (!contentPerformanceMap.has(fileId)) {
          contentPerformanceMap.set(fileId, {
            file_id: fileId,
            title: activity.description || 'Unknown Content',
            access_count: 0,
            total_completion: 0,
            total_duration: 0,
            last_accessed: activity.created_at
          });
        }
        const content = contentPerformanceMap.get(fileId);
        content.access_count += 1;
        content.total_completion += activity.activity_metadata?.completion_percentage || 0;
        content.total_duration += activity.activity_metadata?.session_duration || 0;
        if (new Date(activity.created_at) > new Date(content.last_accessed)) {
          content.last_accessed = activity.created_at;
        }
      }
    });

    return Array.from(contentPerformanceMap.values()).map(content => ({
      file_id: content.file_id,
      title: content.title,
      avg_completion: content.access_count > 0 ? content.total_completion / content.access_count : 0,
      avg_duration: content.access_count > 0 ? content.total_duration / content.access_count : 0,
      access_count: content.access_count,
      last_accessed: content.last_accessed
    }));
  }

  /**
   * Track user activity (replaces API calls)
   */
  static async trackActivity(activityType: string, description: string, xpEarned: number = 0, metadata: any = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_activities')
      .insert({
        user_id: user.id,
        activity_type: activityType,
        description,
        xp_earned: xpEarned,
        activity_metadata: metadata
      });

    if (error) {
      console.error('Failed to track activity:', error);
    }
  }

  /**
   * Get user statistics summary
   */
  static async getUserStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get total XP and activities
    const { data: activities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('xp_earned')
      .eq('user_id', user.id);

    if (activitiesError) throw activitiesError;

    const totalXP = activities?.reduce((sum, a) => sum + (a.xp_earned || 0), 0) || 0;
    const currentLevel = Math.floor(totalXP / 100) + 1;
    const xpToNextLevel = (currentLevel * 100) - totalXP;

    // Get session completion rate
    const { data: sessions, error: sessionsError } = await supabase
      .from('study_sessions')
      .select('status')
      .eq('user_id', user.id);

    if (sessionsError) throw sessionsError;

    const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;
    const totalSessions = sessions?.length || 0;
    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    return {
      totalXP,
      currentLevel,
      xpToNextLevel,
      totalActivities: activities?.length || 0,
      completionRate,
      totalSessions,
      completedSessions
    };
  }
} 