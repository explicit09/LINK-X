import { useState } from 'react';
import { toast } from 'sonner';
import { useCourseContext, courseActions } from '../context/CourseContext';
import { Module } from '../types/course.types';
import { moduleOperations } from '@/lib/db/operations';
import { useModules } from '@/lib/hooks/useDatabase';

export const useModuleManager = (courseId: string) => {
  const { state, dispatch } = useCourseContext();
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // ✅ NEW: Use Supabase hook for real-time updates
  const { refetch: refetchModules } = useModules(courseId);

  const createModule = async (title: string, description?: string) => {
    if (!title.trim()) {
      toast.error('Module title is required');
      return;
    }

    setIsCreating(true);

    try {
      // ✅ NEW: Use direct Supabase operations
      const newModule = await moduleOperations.createModule(courseId, {
        title: title.trim(),
        description: description?.trim() || undefined,
        ordering: state.modules.length, // Add to end by default
      });

      // Add the new module to the local state
      const moduleToAdd: Module = {
        id: newModule.id,
        title: newModule.title,
        description: newModule.description || '',
        materials: [],
        isExpanded: true,
      };

      dispatch(courseActions.addModule(moduleToAdd));
      
      // Refresh modules to get latest state
      refetchModules();
      
      toast.success('Module created successfully');
      return moduleToAdd;
    } catch (error) {
      console.error('Error creating module:', error);
      toast.error('Failed to create module. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const updateModule = async (
    moduleId: string,
    title: string,
    description?: string,
  ) => {
    if (!title.trim()) {
      toast.error('Module title is required');
      return;
    }

    setIsUpdating(true);

    try {
      // ✅ NEW: Use direct Supabase operations
      await moduleOperations.updateModule(moduleId, {
        title: title.trim(),
        description: description?.trim() || undefined,
      });

      dispatch(
        courseActions.updateModule(moduleId, {
          title: title.trim(),
          description: description?.trim() || undefined,
        }),
      );

      // Refresh modules to get latest state
      refetchModules();
      
      toast.success('Module updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating module:', error);
      toast.error('Failed to update module. Please try again.');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteModule = async (moduleId: string) => {
    const module = state.modules.find((m) => m.id === moduleId);

    if (!module) {
      toast.error('Module not found');
      return;
    }

    if (module.materials.length > 0) {
      toast.error('Cannot delete module with files', {
        description:
          'Please delete all files in the module first, then try again.',
      });
      return;
    }

    setIsDeleting(true);

    try {
      // ✅ NEW: Use direct Supabase operations
      await moduleOperations.deleteModule(moduleId);

      dispatch(courseActions.deleteModule(moduleId));
      
      // Refresh modules to get latest state
      refetchModules();
      
      toast.success('Module deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting module:', error);
      toast.error('Failed to delete module. Please try again.');
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    dispatch(courseActions.toggleModule(moduleId));

    // Persist accordion state in localStorage
    try {
      const updatedModules = state.modules.map((module) =>
        module.id === moduleId
          ? { ...module, isExpanded: !module.isExpanded }
          : module,
      );

      const accordionState = updatedModules.reduce(
        (acc, module) => {
          acc[module.id] = module.isExpanded;
          return acc;
        },
        {} as Record<string, boolean>,
      );

      localStorage.setItem(
        `course-${courseId}-accordion`,
        JSON.stringify(accordionState),
      );
    } catch (error) {
      console.warn('Failed to persist accordion state:', error);
    }
  };

  return {
    createModule,
    updateModule,
    deleteModule,
    toggleModule,
    isCreating,
    isUpdating,
    isDeleting,
  };
};
