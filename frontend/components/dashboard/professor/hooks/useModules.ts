import { useState, useEffect } from 'react';
import { instructorAPI } from '@/lib/api';
import { toast } from 'sonner';

export interface Module {
  id: string;
  title: string;
  files: File[];
}

export interface File {
  id: string;
  title: string;
  filename?: string;
}

export interface CreateModuleData {
  title: string;
}

export function useModules(courseId: string | null) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch modules for a course
  const fetchModules = async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await instructorAPI.getModules(courseId);
      setModules(response);
    } catch (err) {
      console.error('Error fetching modules:', err);
      setError('Failed to load modules');
      toast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  // Create a new module
  const createModule = async (
    moduleData: CreateModuleData,
  ): Promise<Module | null> => {
    if (!courseId) return null;

    try {
      const newModule = await instructorAPI.createModule(courseId, moduleData);
      setModules((prev) => [...prev, newModule]);
      toast.success('Module created successfully');
      return newModule;
    } catch (err) {
      console.error('Error creating module:', err);
      toast.error('Failed to create module');
      return null;
    }
  };

  // Update module
  const updateModule = async (
    moduleId: string,
    updateData: Partial<CreateModuleData>,
  ): Promise<Module | null> => {
    try {
      const updatedModule = await instructorAPI.updateModule(
        moduleId,
        updateData,
      );
      setModules((prev) =>
        prev.map((module) =>
          module.id === moduleId ? { ...module, ...updatedModule } : module,
        ),
      );
      toast.success('Module updated successfully');
      return updatedModule;
    } catch (err) {
      console.error('Error updating module:', err);
      toast.error('Failed to update module');
      return null;
    }
  };

  // Delete module
  const deleteModule = async (moduleId: string): Promise<boolean> => {
    try {
      await instructorAPI.deleteModule(moduleId);
      setModules((prev) => prev.filter((module) => module.id !== moduleId));
      toast.success('Module deleted successfully');
      return true;
    } catch (err) {
      console.error('Error deleting module:', err);
      toast.error('Failed to delete module');
      return false;
    }
  };

  // Add file to module (update module's files list)
  const addFileToModule = (moduleId: string, file: File) => {
    setModules((prev) =>
      prev.map((module) =>
        module.id === moduleId
          ? { ...module, files: [...module.files, file] }
          : module,
      ),
    );
  };

  // Remove file from module
  const removeFileFromModule = (moduleId: string, fileId: string) => {
    setModules((prev) =>
      prev.map((module) =>
        module.id === moduleId
          ? { ...module, files: module.files.filter((f) => f.id !== fileId) }
          : module,
      ),
    );
  };

  // Get module by ID
  const getModuleById = (moduleId: string) => {
    return modules.find((module) => module.id === moduleId);
  };

  // Load modules when courseId changes
  useEffect(() => {
    if (courseId) {
      fetchModules();
    } else {
      setModules([]);
    }
  }, [courseId]);

  return {
    modules,
    loading,
    error,
    createModule,
    updateModule,
    deleteModule,
    addFileToModule,
    removeFileFromModule,
    getModuleById,
    refetch: fetchModules,
  };
}
