import { useState } from 'react';
import { toast } from 'sonner';
import { studentAPI, instructorAPI } from '@/lib/api';
import { useCourseContext, courseActions } from '../context/CourseContext';
import { Module } from '../types/course.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const useModuleManager = (courseId: string) => {
  const { state, dispatch } = useCourseContext();
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const createModule = async (title: string, description?: string) => {
    if (!title.trim()) {
      toast.error('Module title is required');
      return;
    }

    setIsCreating(true);

    try {
      const endpoint = `/api/v2/courses/${courseId}/modules`;

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          description: description?.trim() || undefined,
        }),
      });

      if (!response.ok) {
        let errorMsg = `Failed to create module: ${response.statusText}`;
        try {
          const errJson = await response.json();
          errorMsg = errJson.error || errorMsg;
        } catch {}
        toast.error(errorMsg);
        return;
      }

      const responseData = await response.json();
      const newModule = responseData.module;

      // Add the new module to the local state
      const moduleToAdd: Module = {
        id: newModule.id || `temp-${Date.now()}`,
        title: newModule.title || 'New Module',
        description: newModule.description || '',
        materials: [],
        isExpanded: true,
      };

      dispatch(courseActions.addModule(moduleToAdd));
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
      const api =
        state.currentUser?.role === 'instructor' ? instructorAPI : studentAPI;

      const response = await api.updateModule(courseId, moduleId, {
        title: title.trim(),
        description: description?.trim() || undefined,
      });

      if (response.ok) {
        dispatch(
          courseActions.updateModule(moduleId, {
            title: title.trim(),
            description: description?.trim() || undefined,
          }),
        );

        toast.success('Module updated successfully');
        return true;
      } else {
        const errorData = await response.json();
        toast.error(
          errorData.error || 'Failed to update module. Please try again.',
        );
        return false;
      }
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
      const endpoint =
        state.currentUser?.role === 'student'
          ? `/student/modules/${moduleId}`
          : `/instructor/modules/${moduleId}`;

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete module: ${response.statusText}`);
      }

      dispatch(courseActions.deleteModule(moduleId));
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
