/**
 * Schedule Types
 * Centralized type definitions for the schedule feature
 */

export interface StudySession {
  id: string;
  title: string;
  course: string;
  duration: string;
  cognitiveLoad: 'high' | 'medium' | 'low';
  urgency: 'urgent' | 'soon' | 'later';
  xpReward: number;
  type: 'assignment' | 'study' | 'meeting' | 'lab';
  dueIn?: string;
  estimatedStart: string;
  isGhost?: boolean;
}

export interface CourseConfig {
  [key: string]: {
    color: string;
    name: string;
  };
}

export interface ScheduleViewMode {
  mode: 'stack' | 'calendar' | 'month';
}

export interface ScheduleFilters {
  visibleFilters: Set<string>;
  hiddenCourses: Set<string>;
  showCompressedHours: boolean;
}

export interface SessionOperations {
  createSession: (session: Partial<StudySession>) => void;
  updateSession: (id: string, updates: Partial<StudySession>) => void;
  deleteSession: (id: string) => void;
  startSession: (session: StudySession) => void;
  completeSession: (session: StudySession) => void;
}

export interface ScheduleState {
  sessions: StudySession[];
  selectedSession: StudySession | null;
  activeSession: StudySession | null;
  completedSessions: Set<string>;
  isLoading: boolean;
}