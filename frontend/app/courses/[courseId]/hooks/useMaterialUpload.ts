import { useState } from 'react';
import { toast } from 'sonner';
import { useCourseContext, courseActions } from '../context/CourseContext';
import { createModuleStructure } from '../utils/moduleStructure';
import {
  formatRelativeTime,
  getFileType,
  formatFileSize,
} from '../utils/courseHelpers';
import { Material } from '../types/course.types';
import { useFiles, useModules } from '@/lib/hooks/useDatabase';
import { fileOperations } from '@/lib/db/operations';

export const useMaterialUpload = (courseId: string) => {
  const { state, dispatch } = useCourseContext();
  const [isDeleting, setIsDeleting] = useState(false);
  
  // ✅ NEW: Use Supabase operations instead of API calls
  const { modules } = useModules(courseId);

  const handleUploadComplete = async (newFile: any) => {
    try {
      if (!newFile) {
        console.warn('Upload completed but no file data received');
        return;
      }

      // Normalize the file data
      const moduleId = newFile.moduleId || newFile.module_id;

      // Create material object
      const newMaterial: Material = {
        id: newFile.id,
        title: newFile.title || newFile.name || newFile.filename,
        type: getFileType(newFile.file_type || newFile.type || ''),
        size: newFile.size || formatFileSize(newFile.file_size || 0),
        uploadedAt: formatRelativeTime(
          newFile.created_at || newFile.uploadedAt || new Date().toISOString(),
        ),
        processed: newFile.processed !== false,
        moduleId: moduleId,
        moduleName: newFile.moduleName,
      };

      // Add material to the appropriate module
      dispatch(courseActions.addMaterial(moduleId, newMaterial));

      // ✅ NEW: Modules are automatically updated via real-time subscriptions
      // No need for manual refresh - the useModules hook handles this

      toast.success(`${newMaterial.title} uploaded successfully!`);
      return true;
    } catch (error) {
      console.error('Error handling upload completion:', error);
      toast.error('Upload completed but failed to update interface');
      return false;
    }
  };

  const deleteFile = async (fileId: string, moduleId: string) => {
    setIsDeleting(true);

    try {
      // ✅ NEW: Use direct Supabase operations instead of API
      await fileOperations.deleteFile(fileId);

      // Remove the file from the local state
      dispatch(courseActions.deleteMaterial(moduleId, fileId));

      toast.success('File deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file. Please try again.');
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const bulkDeleteFiles = async (fileIds: string[]) => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${fileIds.length} files? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      // ✅ NEW: Delete files using direct Supabase operations
      for (const fileId of fileIds) {
        await fileOperations.deleteFile(fileId);
      }

      // Remove files from local state
      const modulesToUpdate = new Map<string, string[]>();

      // Group file IDs by module
      state.modules.forEach((module) => {
        const filesToDelete = module.materials
          .filter((material) => fileIds.includes(material.id))
          .map((material) => material.id);

        if (filesToDelete.length > 0) {
          modulesToUpdate.set(module.id, filesToDelete);
        }
      });

      // Update each module
      modulesToUpdate.forEach((materialIds, moduleId) => {
        materialIds.forEach((materialId) => {
          dispatch(courseActions.deleteMaterial(moduleId, materialId));
        });
      });

      // Clear selection
      dispatch(courseActions.clearFileSelection());

      toast.success(`${fileIds.length} files deleted successfully`);
      return true;
    } catch (error) {
      console.error('Error deleting files:', error);
      toast.error('Failed to delete some files. Please try again.');
      return false;
    }
  };

  const toggleFileSelection = (fileId: string) => {
    dispatch(courseActions.toggleFileSelection(fileId));
  };

  const clearFileSelection = () => {
    dispatch(courseActions.clearFileSelection());
  };

  return {
    handleUploadComplete,
    deleteFile,
    bulkDeleteFiles,
    toggleFileSelection,
    clearFileSelection,
    selectedFiles: state.selectedFiles,
    isDeleting,
  };
};
