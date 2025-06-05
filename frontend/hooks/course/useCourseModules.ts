import { useState, useEffect } from 'react';
import { courseAPI } from '@/lib/api/courses';

export interface Material {
  id: string;
  title: string;
  type: 'video' | 'pdf' | 'assignment';
  completed: boolean;
  urgent: boolean;
  timeSpent?: string;
  estimatedTime?: string;
  filename?: string;
  file_type?: string;
  file_size?: number;
  view_count?: number;
  chat_count?: number;
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  progress: number;
  materials: number;
  completed: number;
  timeSpent: string;
  estimatedTime: string;
  status: 'completed' | 'in-progress' | 'urgent' | 'locked';
  weaknessScore: number;
  confidenceLevel: number;
  materials_list: Material[];
  ordering: number;
  lastAccessed?: string;
}

export const useCourseModules = (courseId: string) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateModuleProgress = (materials: any[]): number => {
    if (!materials || materials.length === 0) return 0;
    
    // Calculate progress based on view counts and chat interactions
    let totalEngagement = 0;
    materials.forEach(material => {
      const viewCount = material.view_count_raw || 0;
      const chatCount = material.chat_count || 0;
      
      // Simple engagement score: has been viewed + has been discussed
      if (viewCount > 0) totalEngagement += 0.7; // 70% for viewing
      if (chatCount > 0) totalEngagement += 0.3; // 30% for engaging with chat
    });
    
    return Math.min(100, (totalEngagement / materials.length) * 100);
  };

  const calculateConfidenceLevel = (materials: any[], progress: number): number => {
    if (!materials || materials.length === 0) return 0;
    
    // Base confidence on engagement depth
    let avgChatCount = 0;
    materials.forEach(material => {
      avgChatCount += material.chat_count || 0;
    });
    avgChatCount = avgChatCount / materials.length;
    
    // Higher chat count indicates more questions/engagement (could mean lower or higher confidence)
    // We'll interpret moderate engagement as higher confidence
    let baseConfidence = Math.min(90, progress * 0.8); // Base on progress
    
    // Adjust based on engagement patterns
    if (avgChatCount > 3) {
      baseConfidence = Math.max(baseConfidence, 65); // Heavy engagement suggests good understanding
    } else if (avgChatCount > 1) {
      baseConfidence = Math.max(baseConfidence, 75); // Moderate engagement is good
    }
    
    return Math.round(baseConfidence);
  };

  const determineModuleStatus = (progress: number, index: number, totalModules: number): Module['status'] => {
    if (progress >= 90) return 'completed';
    if (index === 0 || progress > 0) return 'in-progress';
    
    // Check if previous module is completed (simple linear progression)
    const isUnlocked = index === 0 || progress > 0;
    if (!isUnlocked) return 'locked';
    
    // Mark as urgent if it's the next logical module and hasn't been started
    if (progress === 0 && index <= 2) return 'urgent';
    
    return index < 3 ? 'in-progress' : 'locked';
  };

  const estimateTimeSpent = (materials: any[]): string => {
    if (!materials || materials.length === 0) return '0h';
    
    let totalMinutes = 0;
    materials.forEach(material => {
      const viewCount = material.view_count_raw || 0;
      const chatCount = material.chat_count || 0;
      
      // Estimate time based on file type and engagement
      let baseMinutes = 0;
      if (material.file_type === 'video') baseMinutes = 45;
      else if (material.file_type === 'pdf') baseMinutes = 20;
      else baseMinutes = 30;
      
      // Multiple views suggest more time spent
      totalMinutes += (baseMinutes * Math.min(viewCount, 3)) + (chatCount * 5);
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes > 0 ? Math.round(minutes / 10) * 10 + 'm' : ''}`;
    }
    return `${Math.round(minutes / 10) * 10}m`;
  };

  const estimateRemainingTime = (materials: any[], progress: number): string => {
    const baseHours = Math.max(1, materials.length * 0.75); // 45 min per material
    const remainingPercentage = (100 - progress) / 100;
    const remainingHours = Math.ceil(baseHours * remainingPercentage);
    
    return `${remainingHours}h`;
  };

  const mapFileTypeToMaterialType = (fileType: string): Material['type'] => {
    if (fileType === 'video' || fileType === 'audio') return 'video';
    if (fileType === 'pdf') return 'pdf';
    return 'assignment';
  };

  useEffect(() => {
    const loadModules = async () => {
      if (!courseId) return;
      
      try {
        setLoading(true);
        setError(null);

        // Fetch real module data from backend
        const backendModules = await courseAPI.getCourseModules(courseId);
        
        // Handle empty modules gracefully
        if (!backendModules || backendModules.length === 0) {
          setModules([]);
          return;
        }
        
        // Transform backend data to match our interface
        const transformedModules: Module[] = backendModules
          .sort((a, b) => a.ordering - b.ordering)
          .map((module, index) => {
            const materials = module.materials || [];
            const progress = calculateModuleProgress(materials);
            const confidenceLevel = calculateConfidenceLevel(materials, progress);
            const status = determineModuleStatus(progress, index, backendModules.length);
            
            // Transform materials
            const materialsWithMetrics: Material[] = materials.map(material => ({
              id: material.id,
              title: material.title,
              type: mapFileTypeToMaterialType(material.file_type),
              completed: (material.view_count_raw || 0) > 0,
              urgent: status === 'urgent' && (material.view_count_raw || 0) === 0,
              filename: material.filename,
              file_type: material.file_type,
              file_size: material.file_size,
              view_count: material.view_count_raw || 0,
              chat_count: material.chat_count || 0,
              timeSpent: (material.view_count_raw || 0) > 0 ? '45min' : undefined,
              estimatedTime: material.file_type === 'video' ? '60min' : '30min'
            }));

            return {
              id: module.id,
              title: module.title,
              description: module.description,
              progress: Math.round(progress),
              materials: materials.length,
              completed: materialsWithMetrics.filter(m => m.completed).length,
              timeSpent: estimateTimeSpent(materials),
              estimatedTime: estimateRemainingTime(materials, progress),
              status,
              weaknessScore: Math.max(0, 100 - confidenceLevel),
              confidenceLevel,
              materials_list: materialsWithMetrics,
              ordering: module.ordering,
              lastAccessed: status === 'in-progress' && progress > 0 ? '2 hours ago' : undefined
            };
          });

        setModules(transformedModules);

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