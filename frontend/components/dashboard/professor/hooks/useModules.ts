import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useModules as useSupabaseModules } from '@/lib/hooks/useDatabase';

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
  // ✅ NEW: Use Supabase hooks instead of API calls
  const { 
    modules: supabaseModules, 
    loading, 
    error, 
    createModule: createModuleFromHook,
    updateModule: updateModuleFromHook,
    deleteModule: deleteModuleFromHook,
    refetch
  } = useSupabaseModules(courseId || '');

  // Transform Supabase modules to match professor interface
  const modules: Module[] = supabaseModules.map(module => ({
    id: module.id,
    title: module.title,
    files: (module.files || []).map(file => ({
      id: file.id,
      title: file.title,
      filename: file.filename,
    })),
  }));

  // Create a new module
  const createModule = async (
    moduleData: CreateModuleData,
  ): Promise<Module | null> => {
    if (!courseId) return null;

    try {
      const newModule = await createModuleFromHook({
        ...moduleData,
        ordering: modules.length, // Add to end by default
      });

      toast.success('Module created successfully');
      
      // Transform to professor interface
      return {
        id: newModule.id,
        title: newModule.title,
        files: [],
      };
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
      const updatedModule = await updateModuleFromHook(moduleId, updateData);
      toast.success('Module updated successfully');
      
      // Find the updated module from our list
      const moduleWithFiles = modules.find(m => m.id === moduleId);
      return {
        id: updatedModule.id,
        title: updatedModule.title,
        files: moduleWithFiles?.files || [],
      };
    } catch (err) {
      console.error('Error updating module:', err);
      toast.error('Failed to update module');
      return null;
    }
  };

  // Delete module
  const deleteModule = async (moduleId: string): Promise<boolean> => {
    try {
      await deleteModuleFromHook(moduleId);
      toast.success('Module deleted successfully');
      return true;
    } catch (err) {
      console.error('Error deleting module:', err);
      toast.error('Failed to delete module');
      return false;
    }
  };

  // Add file to module (optimistic update - real-time subscription will sync)
  const addFileToModule = (moduleId: string, file: File) => {
    // With real-time subscriptions, this will automatically update
    // We could trigger a refetch here if needed
    refetch();
  };

  // Remove file from module (optimistic update - real-time subscription will sync)
  const removeFileFromModule = (moduleId: string, fileId: string) => {
    // With real-time subscriptions, this will automatically update
    // We could trigger a refetch here if needed
    refetch();
  };

  // Get module by ID
  const getModuleById = (moduleId: string) => {
    return modules.find((module) => module.id === moduleId);
  };

  return {
    modules: courseId ? modules : [], // Only return modules if courseId is provided
    loading: courseId ? loading : false,
    error: courseId ? error : null,
    createModule,
    updateModule,
    deleteModule,
    addFileToModule,
    removeFileFromModule,
    getModuleById,
    refetch,
  };
}
