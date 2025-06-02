import { useState, useEffect } from 'react';

export interface Material {
  id: string;
  title: string;
  type: 'video' | 'pdf' | 'assignment';
  completed: boolean;
  urgent: boolean;
  timeSpent?: string;
  estimatedTime?: string;
}

export interface Module {
  id: string;
  title: string;
  progress: number;
  materials: number;
  completed: number;
  timeSpent: string;
  estimatedTime: string;
  status: 'completed' | 'in-progress' | 'urgent' | 'locked';
  weaknessScore: number;
  confidenceLevel: number;
  materials_list: Material[];
}

export const useCourseModules = (courseId: string) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModules = async () => {
      if (!courseId) return;
      
      try {
        setLoading(true);
        setError(null);

        // For now, use mock module data (preserve existing functionality)
        // TODO: Replace with real API call when modules API is ready
        const mockModules: Module[] = [
          {
            id: 'module-1',
            title: 'Introduction to Machine Learning',
            progress: 100,
            materials: 8,
            completed: 8,
            timeSpent: '4.2h',
            estimatedTime: '4h',
            status: 'completed',
            weaknessScore: 15,
            confidenceLevel: 92,
            materials_list: [
              {
                id: 'mat-1-1',
                title: 'Introduction Video',
                type: 'video',
                completed: true,
                urgent: false,
                timeSpent: '45min',
                estimatedTime: '60min',
              },
              {
                id: 'mat-1-2',
                title: 'Course Syllabus',
                type: 'pdf',
                completed: true,
                urgent: false,
                timeSpent: '15min',
                estimatedTime: '30min',
              },
            ],
          },
          {
            id: 'module-2',
            title: 'Linear Regression',
            progress: 85,
            materials: 12,
            completed: 10,
            timeSpent: '6.8h',
            estimatedTime: '8h',
            status: 'in-progress',
            weaknessScore: 35,
            confidenceLevel: 78,
            materials_list: [
              {
                id: 'mat-2-1',
                title: 'Linear Regression Theory',
                type: 'video',
                completed: true,
                urgent: false,
                timeSpent: '90min',
                estimatedTime: '90min',
              },
              {
                id: 'mat-2-2',
                title: 'Gradient Descent Assignment',
                type: 'assignment',
                completed: false,
                urgent: true,
                estimatedTime: '3h',
              },
            ],
          },
          {
            id: 'module-3',
            title: 'Neural Networks',
            progress: 25,
            materials: 15,
            completed: 4,
            timeSpent: '2.1h',
            estimatedTime: '12h',
            status: 'urgent',
            weaknessScore: 65,
            confidenceLevel: 45,
            materials_list: [
              {
                id: 'mat-3-1',
                title: 'Neural Network Basics',
                type: 'video',
                completed: true,
                urgent: false,
                timeSpent: '75min',
                estimatedTime: '90min',
              },
              {
                id: 'mat-3-2',
                title: 'Backpropagation Assignment',
                type: 'assignment',
                completed: false,
                urgent: true,
                estimatedTime: '4h',
              },
            ],
          },
          {
            id: 'module-4',
            title: 'Deep Learning',
            progress: 0,
            materials: 20,
            completed: 0,
            timeSpent: '0h',
            estimatedTime: '16h',
            status: 'locked',
            weaknessScore: 0,
            confidenceLevel: 0,
            materials_list: [],
          },
        ];

        setModules(mockModules);

      } catch (error) {
        console.error('Failed to load course modules:', error);
        setError('Failed to load course modules');
        setModules([]);
      } finally {
        setLoading(false);
      }
    };

    loadModules();
  }, [courseId]);

  return {
    modules,
    loading,
    error,
    refetch: () => {
      if (courseId) {
        setLoading(true);
        setModules([]);
      }
    }
  };
};