'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGamification } from '@/contexts/GamificationContext';
import { useStudyTime } from '@/hooks/useStudyTime';
import { useDashboardOverview } from '@/hooks/useDashboardData';

export interface UserBehaviorPattern {
  preferredStudyTimes: {
    hour: number;
    frequency: number;
    effectiveness: number;
  }[];
  studySessionPatterns: {
    averageDuration: number;
    optimalDuration: number;
    frequencyPerWeek: number;
    preferredDays: string[];
  };
  coursePreferences: {
    favoriteSubjects: string[];
    completionRates: Record<string, number>;
    engagementScores: Record<string, number>;
  };
  learningStyle: {
    prefersPDF: boolean;
    prefersVideo: boolean;
    prefersAudio: boolean;
    prefersInteractive: boolean;
  };
  progressVelocity: {
    xpPerDay: number;
    xpPerHour: number;
    weeklyGrowthRate: number;
    peakPerformanceDays: string[];
  };
}

export interface SmartDefault {
  id: string;
  type: 'schedule' | 'goal' | 'reminder' | 'suggestion';
  value: any;
  confidence: number; // 0-1 confidence score
  reason: string;
}

export function useUserBehavior() {
  const { user } = useAuth();
  const { userStats } = useGamification();
  const { weeklyStudyHours, dailyStudyTime, sessionHistory } = useStudyTime('month');
  const { data: dashboardData } = useDashboardOverview();
  
  const [behaviorPattern, setBehaviorPattern] = useState<UserBehaviorPattern | null>(null);
  const [smartDefaults, setSmartDefaults] = useState<SmartDefault[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analyze study time patterns
  const analyzeStudyPatterns = useCallback(() => {
    if (!sessionHistory || sessionHistory.length === 0) return null;

    // Group sessions by hour of day
    const hourlyPatterns = new Map<number, { count: number; totalXP: number; totalDuration: number }>();
    const dayPatterns = new Map<string, number>();
    
    sessionHistory.forEach(session => {
      const startDate = new Date(session.startTime);
      const hour = startDate.getHours();
      const day = startDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      // Hour patterns
      const existing = hourlyPatterns.get(hour) || { count: 0, totalXP: 0, totalDuration: 0 };
      hourlyPatterns.set(hour, {
        count: existing.count + 1,
        totalXP: existing.totalXP + (session.xpEarned || 0),
        totalDuration: existing.totalDuration + session.duration
      });
      
      // Day patterns
      dayPatterns.set(day, (dayPatterns.get(day) || 0) + 1);
    });

    // Convert to preferred study times
    const preferredStudyTimes = Array.from(hourlyPatterns.entries())
      .map(([hour, data]) => ({
        hour,
        frequency: data.count,
        effectiveness: data.totalXP / Math.max(data.totalDuration, 1)
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3); // Top 3 hours

    // Calculate average session duration
    const totalDuration = sessionHistory.reduce((sum, s) => sum + s.duration, 0);
    const averageDuration = totalDuration / sessionHistory.length;
    
    // Find optimal duration (sessions with highest XP/minute)
    const sessionsByEfficiency = sessionHistory
      .filter(s => s.xpEarned && s.duration > 0)
      .sort((a, b) => (b.xpEarned! / b.duration) - (a.xpEarned! / a.duration));
    
    const optimalDuration = sessionsByEfficiency.length > 0 
      ? sessionsByEfficiency[0].duration 
      : 25; // Default to 25 minutes

    // Get preferred days
    const preferredDays = Array.from(dayPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([day]) => day);

    return {
      preferredStudyTimes,
      studySessionPatterns: {
        averageDuration,
        optimalDuration,
        frequencyPerWeek: (sessionHistory.length / 4), // Assuming 4 weeks of data
        preferredDays
      }
    };
  }, [sessionHistory]);

  // Analyze course preferences
  const analyzeCoursePreferences = useCallback(() => {
    if (!dashboardData?.courses || dashboardData.courses.length === 0) return null;

    const subjectCounts = new Map<string, number>();
    const completionRates: Record<string, number> = {};
    const engagementScores: Record<string, number> = {};

    dashboardData.courses.forEach(course => {
      // Extract subject from course name or category
      const subject = course.category || course.name.split(' ')[0];
      subjectCounts.set(subject, (subjectCounts.get(subject) || 0) + 1);
      
      // Calculate completion rate
      completionRates[course.id] = course.progress || 0;
      
      // Calculate engagement score (combination of progress, files viewed, etc.)
      engagementScores[course.id] = (
        (course.progress || 0) * 0.5 +
        (course.filesViewed || 0) * 0.3 +
        (course.studyTime || 0) * 0.2
      );
    });

    const favoriteSubjects = Array.from(subjectCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([subject]) => subject);

    return {
      favoriteSubjects,
      completionRates,
      engagementScores
    };
  }, [dashboardData]);

  // Analyze learning style preferences
  const analyzeLearningStyle = useCallback(() => {
    if (!dashboardData?.fileInteractions) {
      return {
        prefersPDF: true, // Default
        prefersVideo: false,
        prefersAudio: false,
        prefersInteractive: false
      };
    }

    const typePreferences = {
      pdf: 0,
      video: 0,
      audio: 0,
      interactive: 0
    };

    dashboardData.fileInteractions.forEach(interaction => {
      if (interaction.fileType.includes('pdf')) typePreferences.pdf++;
      else if (interaction.fileType.includes('video')) typePreferences.video++;
      else if (interaction.fileType.includes('audio')) typePreferences.audio++;
      else typePreferences.interactive++;
    });

    const total = Object.values(typePreferences).reduce((sum, count) => sum + count, 0);

    return {
      prefersPDF: typePreferences.pdf / total > 0.4,
      prefersVideo: typePreferences.video / total > 0.3,
      prefersAudio: typePreferences.audio / total > 0.2,
      prefersInteractive: typePreferences.interactive / total > 0.2
    };
  }, [dashboardData]);

  // Calculate progress velocity
  const calculateProgressVelocity = useCallback(() => {
    if (!userStats || !sessionHistory || sessionHistory.length === 0) {
      return {
        xpPerDay: 0,
        xpPerHour: 0,
        weeklyGrowthRate: 0,
        peakPerformanceDays: []
      };
    }

    // XP per day (last 30 days)
    const daysActive = new Set(sessionHistory.map(s => 
      new Date(s.startTime).toDateString()
    )).size;
    const xpPerDay = (userStats.total_xp || 0) / Math.max(daysActive, 1);

    // XP per hour
    const totalHours = sessionHistory.reduce((sum, s) => sum + (s.duration / 60), 0);
    const xpPerHour = (userStats.total_xp || 0) / Math.max(totalHours, 1);

    // Weekly growth rate
    const weeklyXP = sessionHistory
      .filter(s => {
        const sessionDate = new Date(s.startTime);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return sessionDate >= weekAgo;
      })
      .reduce((sum, s) => sum + (s.xpEarned || 0), 0);

    const previousWeekXP = sessionHistory
      .filter(s => {
        const sessionDate = new Date(s.startTime);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return sessionDate >= twoWeeksAgo && sessionDate < weekAgo;
      })
      .reduce((sum, s) => sum + (s.xpEarned || 0), 0);

    const weeklyGrowthRate = previousWeekXP > 0 
      ? ((weeklyXP - previousWeekXP) / previousWeekXP) * 100 
      : 0;

    // Peak performance days
    const dayXP = new Map<string, number>();
    sessionHistory.forEach(session => {
      const day = new Date(session.startTime).toLocaleDateString('en-US', { weekday: 'long' });
      dayXP.set(day, (dayXP.get(day) || 0) + (session.xpEarned || 0));
    });

    const peakPerformanceDays = Array.from(dayXP.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([day]) => day);

    return {
      xpPerDay,
      xpPerHour,
      weeklyGrowthRate,
      peakPerformanceDays
    };
  }, [userStats, sessionHistory]);

  // Generate smart defaults based on behavior patterns
  const generateSmartDefaults = useCallback((pattern: UserBehaviorPattern): SmartDefault[] => {
    const defaults: SmartDefault[] = [];

    // Smart schedule suggestion
    if (pattern.preferredStudyTimes.length > 0) {
      const topTime = pattern.preferredStudyTimes[0];
      defaults.push({
        id: 'smart-schedule',
        type: 'schedule',
        value: {
          hour: topTime.hour,
          duration: pattern.studySessionPatterns.optimalDuration,
          days: pattern.studySessionPatterns.preferredDays
        },
        confidence: Math.min(topTime.frequency / 10, 1), // Higher frequency = higher confidence
        reason: `You're most productive at ${topTime.hour}:00 and typically study for ${pattern.studySessionPatterns.optimalDuration} minutes`
      });
    }

    // Smart goal suggestion
    if (pattern.progressVelocity.xpPerDay > 0) {
      const weeklyGoal = Math.round(pattern.progressVelocity.xpPerDay * 7 * 1.1); // 10% stretch
      defaults.push({
        id: 'smart-goal',
        type: 'goal',
        value: {
          weekly_xp: weeklyGoal,
          daily_sessions: Math.ceil(pattern.studySessionPatterns.frequencyPerWeek / 7)
        },
        confidence: 0.8,
        reason: `Based on your average of ${Math.round(pattern.progressVelocity.xpPerDay)} XP/day, aim for ${weeklyGoal} XP this week`
      });
    }

    // Smart reminder suggestion
    if (pattern.preferredStudyTimes.length > 0 && pattern.studySessionPatterns.frequencyPerWeek > 3) {
      defaults.push({
        id: 'smart-reminder',
        type: 'reminder',
        value: {
          time: `${pattern.preferredStudyTimes[0].hour}:00`,
          days: pattern.studySessionPatterns.preferredDays,
          message: 'Time for your study session!'
        },
        confidence: 0.9,
        reason: `You consistently study at this time on ${pattern.studySessionPatterns.preferredDays.join(', ')}`
      });
    }

    // Smart content suggestion
    if (pattern.coursePreferences.favoriteSubjects.length > 0) {
      defaults.push({
        id: 'smart-content',
        type: 'suggestion',
        value: {
          subjects: pattern.coursePreferences.favoriteSubjects,
          contentType: pattern.learningStyle.prefersPDF ? 'pdf' : 
                      pattern.learningStyle.prefersVideo ? 'video' : 'mixed'
        },
        confidence: 0.7,
        reason: `You prefer ${pattern.coursePreferences.favoriteSubjects[0]} content in ${
          pattern.learningStyle.prefersPDF ? 'PDF' : 'video'
        } format`
      });
    }

    return defaults;
  }, []);

  // Main analysis effect
  useEffect(() => {
    if (!user || isAnalyzing) return;

    const analyze = async () => {
      setIsAnalyzing(true);

      try {
        const studyPatterns = analyzeStudyPatterns();
        const coursePrefs = analyzeCoursePreferences();
        const learningStyle = analyzeLearningStyle();
        const progressVelocity = calculateProgressVelocity();

        if (studyPatterns && coursePrefs) {
          const pattern: UserBehaviorPattern = {
            ...studyPatterns,
            coursePreferences: coursePrefs,
            learningStyle,
            progressVelocity
          };

          setBehaviorPattern(pattern);
          setSmartDefaults(generateSmartDefaults(pattern));
        }
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyze();
  }, [
    user,
    analyzeStudyPatterns,
    analyzeCoursePreferences,
    analyzeLearningStyle,
    calculateProgressVelocity,
    generateSmartDefaults,
    isAnalyzing
  ]);

  // Save behavior patterns to localStorage for persistence
  useEffect(() => {
    if (behaviorPattern && user) {
      localStorage.setItem(
        `userBehavior_${user.id}`,
        JSON.stringify(behaviorPattern)
      );
    }
  }, [behaviorPattern, user]);

  // Load saved patterns on mount
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`userBehavior_${user.id}`);
      if (saved) {
        try {
          setBehaviorPattern(JSON.parse(saved));
        } catch (error) {
          console.error('Failed to load saved behavior patterns:', error);
        }
      }
    }
  }, [user]);

  return {
    behaviorPattern,
    smartDefaults,
    isAnalyzing,
    refreshAnalysis: () => {
      setIsAnalyzing(false);
      setBehaviorPattern(null);
    }
  };
}