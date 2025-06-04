export interface Course {
  id: string;
  title: string;
  code: string;
  term?: string;
  description?: string;
  instructor?: string;
  studentsCount?: number;
  materialsCount?: number;
}

export interface CourseProgress {
  completedMaterials: number;
  totalMaterials: number;
  weeklyTimeMinutes: number;
  todayTimeMinutes: number;
  progressPercentage: number;
}

export interface TodoItem {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  type: 'reading' | 'quiz' | 'assignment' | 'review';
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

export interface AchievementBadge {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  description: string;
}

export interface StatsSidePanelProps {
  course: Course | null;
  courseProgress: CourseProgress;
  onUpdateDescription: (description: string) => void;
  userRole: string;
}
