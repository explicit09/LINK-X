import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface Material {
  id: string;
  title: string;
  fileType: string;
  uploadDate: string;
  fileSize?: number;
  aiSummary?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  chunkCount?: number;
  uploadTime?: string;
}

export interface Module {
  id: string;
  title: string;
  isExpanded: boolean;
  isEditing: boolean;
  editTitle: string;
  materials: Material[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateModuleData {
  title: string;
  courseId: string;
}

export function useModuleManager(courseId: string, userRole: 'instructor' | 'student' = 'student') {
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch modules from API
  const fetchModules = useCallback(async () => {
    if (!courseId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/courses/${courseId}/modules`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch modules');
      }

      const data = await response.json();
      
      // Transform API data to match our interface
      const transformedModules: Module[] = data.modules?.map((module: any) => ({
        id: module.id,
        title: module.title,
        isExpanded: false,
        isEditing: false,
        editTitle: module.title,
        materials: module.materials || [],
        createdAt: module.createdAt,
        updatedAt: module.updatedAt,
      })) || [];

      setModules(transformedModules);
    } catch (err) {
      console.error('Error fetching modules:', err);
      setError('Failed to load modules');
      toast.error('Failed to load modules');
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  // Create a new module
  const createModule = useCallback(async (title?: string) => {
    if (!courseId) return;

    const moduleTitle = title || `Module ${modules.length + 1}`;

    try {
      const response = await fetch(`/api/courses/${courseId}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ title: moduleTitle }),
      });

      if (!response.ok) {
        throw new Error('Failed to create module');
      }

      const newModule = await response.json();
      
      const transformedModule: Module = {
        id: newModule.id,
        title: newModule.title,
        isExpanded: true,
        isEditing: false,
        editTitle: newModule.title,
        materials: [],
        createdAt: newModule.createdAt,
        updatedAt: newModule.updatedAt,
      };

      setModules(prev => [...prev, transformedModule]);
      toast.success('Module created successfully');
      return transformedModule;
    } catch (err) {
      console.error('Error creating module:', err);
      toast.error('Failed to create module');
      return null;
    }
  }, [courseId, modules.length]);

  // Update module
  const updateModule = useCallback(async (moduleId: string, updates: Partial<Pick<Module, 'title'>>) => {
    try {
      const response = await fetch(`/api/modules/${moduleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update module');
      }

      const updatedModule = await response.json();

      setModules(prev =>
        prev.map(module =>
          module.id === moduleId
            ? { ...module, ...updates, editTitle: updates.title || module.editTitle }
            : module
        )
      );

      toast.success('Module updated successfully');
      return updatedModule;
    } catch (err) {
      console.error('Error updating module:', err);
      toast.error('Failed to update module');
      return null;
    }
  }, []);

  // Delete module
  const deleteModule = useCallback(async (moduleId: string) => {
    try {
      const response = await fetch(`/api/modules/${moduleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete module');
      }

      setModules(prev => prev.filter(module => module.id !== moduleId));
      toast.success('Module deleted successfully');
      return true;
    } catch (err) {
      console.error('Error deleting module:', err);
      toast.error('Failed to delete module');
      return false;
    }
  }, []);

  // Toggle module expansion
  const toggleModule = useCallback((moduleId: string) => {
    setModules(prev =>
      prev.map(module =>
        module.id === moduleId
          ? { ...module, isExpanded: !module.isExpanded }
          : module
      )
    );
  }, []);

  // Start editing module title
  const startEditing = useCallback((moduleId: string) => {
    setModules(prev =>
      prev.map(module =>
        module.id === moduleId
          ? { ...module, isEditing: true, editTitle: module.title }
          : module
      )
    );
  }, []);

  // Cancel editing module title
  const cancelEditing = useCallback((moduleId: string) => {
    setModules(prev =>
      prev.map(module =>
        module.id === moduleId
          ? { ...module, isEditing: false, editTitle: module.title }
          : module
      )
    );
  }, []);

  // Save edited module title
  const saveEdit = useCallback(async (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module || !module.editTitle.trim()) return;

    const success = await updateModule(moduleId, { title: module.editTitle.trim() });
    if (success) {
      setModules(prev =>
        prev.map(m =>
          m.id === moduleId
            ? { ...m, isEditing: false, title: m.editTitle.trim() }
            : m
        )
      );
    }
  }, [modules, updateModule]);

  // Update edit title
  const updateEditTitle = useCallback((moduleId: string, title: string) => {
    setModules(prev =>
      prev.map(module =>
        module.id === moduleId
          ? { ...module, editTitle: title }
          : module
      )
    );
  }, []);

  // Add material to module
  const addMaterialToModule = useCallback((moduleId: string, material: Material) => {
    setModules(prev =>
      prev.map(module =>
        module.id === moduleId
          ? { ...module, materials: [...module.materials, material] }
          : module
      )
    );
  }, []);

  // Remove material from module
  const removeMaterialFromModule = useCallback((moduleId: string, materialId: string) => {
    setModules(prev =>
      prev.map(module =>
        module.id === moduleId
          ? { ...module, materials: module.materials.filter(m => m.id !== materialId) }
          : module
      )
    );
  }, []);

  // Initial load
  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  return {
    modules,
    isLoading,
    error,
    createModule,
    updateModule,
    deleteModule,
    toggleModule,
    startEditing,
    cancelEditing,
    saveEdit,
    updateEditTitle,
    addMaterialToModule,
    removeMaterialFromModule,
    refetch: fetchModules,
    canModify: userRole === 'instructor'
  };
}