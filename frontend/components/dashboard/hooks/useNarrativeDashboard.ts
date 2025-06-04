'use client';

import { useState } from 'react';

interface WeeklyProgressData {
  completedGoals: number;
  totalGoals: number;
  studyHours: number;
  aiInteractions: number;
  completionRate: number;
}

interface SmartAction {
  id: string;
  title: string;
  description: string;
  urgency: 'urgent' | 'medium' | 'low';
  timeEstimate: string;
  category: string;
}

interface AIRecommendation {
  id: string;
  text: string;
  category: string;
  impact: 'high' | 'medium' | 'low';
}

interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  type: 'class' | 'assignment' | 'meeting' | 'study';
  course?: string;
}

interface CoursePreview {
  id: string;
  title: string;
  progress: number;
  nextDeadline: string;
}

/**
 * useNarrativeDashboard - Manages narrative dashboard state and data
 * EXTRACTED from NarrativeDashboard.tsx to separate data logic from UI
 */
export const useNarrativeDashboard = () => {
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const [isCoursesExpanded, setIsCoursesExpanded] = useState(false);

  // Mock data - in real app, this would come from API
  const weeklyProgress: WeeklyProgressData = {
    completedGoals: 7,
    totalGoals: 10,
    studyHours: 12,
    aiInteractions: 23,
    completionRate: 70,
  };

  const smartActions: SmartAction[] = [
    {
      id: '1',
      title: 'Review CS101 Assignment',
      description: 'Grade pending submissions from yesterday',
      urgency: 'urgent',
      timeEstimate: '15 min',
      category: 'Grading',
    },
    {
      id: '2',
      title: 'Prepare WEB201 Quiz',
      description: 'Create quiz for Module 4 covering React hooks',
      urgency: 'medium',
      timeEstimate: '30 min',
      category: 'Content Creation',
    },
    {
      id: '3',
      title: 'Office Hours Planning',
      description: 'Schedule extra office hours for midterm prep',
      urgency: 'low',
      timeEstimate: '10 min',
      category: 'Planning',
    },
  ];

  const aiRecommendations: AIRecommendation[] = [
    {
      id: '1',
      text: 'Consider adding interactive coding exercises to Module 3 based on student engagement patterns.',
      category: 'Content Enhancement',
      impact: 'high',
    },
    {
      id: '2',
      text: 'Schedule a review session for students struggling with data structures concepts.',
      category: 'Student Support',
      impact: 'high',
    },
    {
      id: '3',
      text: 'Update assignment due dates to better distribute workload across the semester.',
      category: 'Course Planning',
      impact: 'medium',
    },
  ];

  const todaySchedule: ScheduleItem[] = [
    {
      id: '1',
      title: 'CS101 Lecture',
      time: '9:00 AM',
      type: 'class',
      course: 'Introduction to Computer Science',
    },
    {
      id: '2',
      title: 'Office Hours',
      time: '2:00 PM',
      type: 'meeting',
    },
    {
      id: '3',
      title: 'WEB201 Assignment Due',
      time: '11:59 PM',
      type: 'assignment',
      course: 'Web Development',
    },
    {
      id: '4',
      title: 'Grade Midterm Exams',
      time: '3:00 PM',
      type: 'study',
    },
  ];

  const recentCourses: CoursePreview[] = [
    {
      id: '1',
      title: 'CS101: Intro to Computer Science',
      progress: 75,
      nextDeadline: 'Assignment 3 - Due Tomorrow',
    },
    {
      id: '2',
      title: 'WEB201: Web Development',
      progress: 60,
      nextDeadline: 'Quiz 2 - Due Friday',
    },
    {
      id: '3',
      title: 'DATA301: Data Structures',
      progress: 45,
      nextDeadline: 'Project Proposal - Due Monday',
    },
  ];

  const toggleScheduleExpanded = () => {
    setIsScheduleExpanded(!isScheduleExpanded);
  };

  const toggleCoursesExpanded = () => {
    setIsCoursesExpanded(!isCoursesExpanded);
  };

  return {
    // Data
    weeklyProgress,
    smartActions,
    aiRecommendations,
    todaySchedule,
    recentCourses,
    
    // State
    isScheduleExpanded,
    isCoursesExpanded,
    
    // Actions
    toggleScheduleExpanded,
    toggleCoursesExpanded,
    setIsScheduleExpanded,
    setIsCoursesExpanded,
  };
};