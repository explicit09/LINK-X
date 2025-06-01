// Course-related type definitions

export interface Course {
  id: string;
  title: string;
  code: string;
  term?: string;
  description?: string;
  instructor?: string;
  studentsCount?: number;
  materialsCount?: number;
  color?: string;
  lastActivity?: string;
}

export interface Material {
  id: string;
  title: string;
  type: 'pdf' | 'audio' | 'video' | 'document';
  size?: string;
  uploadedAt: string;
  processed?: boolean;
  viewed?: boolean;
  moduleId?: string;
  moduleName?: string;
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  materials: Material[];
  isExpanded: boolean;
}

export interface AIConversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messageCount: number;
}

export interface Quiz {
  id: string;
  title: string;
  questions: number;
  completed?: boolean;
  score?: number;
  createdAt: string;
}

export interface CourseProgress {
  completedMaterials: number;
  totalMaterials: number;
  weeklyTimeMinutes: number;
  todayTimeMinutes: number;
  progressPercentage: number;
}

export interface UserStats {
  filesUploaded: number;
  weeksCompleted: number;
  studyStreak: number;
  aiQuestions: number;
  totalStudyTime: number;
  currentWeekProgress: number;
}

export interface FilterState {
  fileTypes: string[];
  aiProcessed: 'all' | 'processed' | 'unprocessed';
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export interface FileToDelete {
  id: string;
  name: string;
  moduleId: string;
}

export interface ModuleToDelete {
  id: string;
  name: string;
}

export const courseColors = [
  {
    name: 'electric-blue',
    gradient: 'from-blue-500 via-purple-500 to-indigo-600',
    accent: 'blue-500',
    text: 'blue-700',
    bg: 'blue-50',
    border: 'blue-200',
    bar: 'bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600',
  },
  {
    name: 'vibrant-green',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    accent: 'emerald-500',
    text: 'emerald-700',
    bg: 'emerald-50',
    border: 'emerald-200',
    bar: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600',
  },
  {
    name: 'sunset-purple',
    gradient: 'from-purple-500 via-pink-500 to-rose-600',
    accent: 'purple-500',
    text: 'purple-700',
    bg: 'purple-50',
    border: 'purple-200',
    bar: 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-600',
  },
  {
    name: 'coral-orange',
    gradient: 'from-orange-500 via-red-500 to-pink-600',
    accent: 'orange-500',
    text: 'orange-700',
    bg: 'orange-50',
    border: 'orange-200',
    bar: 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-600',
  },
  {
    name: 'ruby-red',
    gradient: 'from-red-500 via-pink-500 to-purple-600',
    accent: 'red-500',
    text: 'red-700',
    bg: 'red-50',
    border: 'red-200',
    bar: 'bg-gradient-to-r from-red-500 via-pink-500 to-purple-600',
  },
  {
    name: 'ocean-teal',
    gradient: 'from-teal-500 via-cyan-500 to-blue-600',
    accent: 'teal-500',
    text: 'teal-700',
    bg: 'teal-50',
    border: 'teal-200',
    bar: 'bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600',
  },
  {
    name: 'golden-yellow',
    gradient: 'from-yellow-500 via-orange-500 to-red-500',
    accent: 'yellow-500',
    text: 'yellow-700',
    bg: 'yellow-50',
    border: 'yellow-200',
    bar: 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500',
  },
  {
    name: 'royal-indigo',
    gradient: 'from-indigo-500 via-purple-500 to-blue-600',
    accent: 'indigo-500',
    text: 'indigo-700',
    bg: 'indigo-50',
    border: 'indigo-200',
    bar: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-600',
  },
];
