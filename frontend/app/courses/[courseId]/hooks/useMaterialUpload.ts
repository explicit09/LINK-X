import { useState } from 'react';
import { toast } from 'sonner';
import { studentAPI, instructorAPI } from '@/lib/api';
import { useCourseContext, courseActions } from '../context/CourseContext';
import { createModuleStructure } from '../utils/moduleStructure';
import {
  formatRelativeTime,
  getFileType,
  formatFileSize,
} from '../utils/courseHelpers';
import { Material } from '../types/course.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const useMaterialUpload = (courseId: string) => {
  const { state, dispatch } = useCourseContext();
  const [isDeleting, setIsDeleting] = useState(false);

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

      // Try to refresh modules from server for consistency
      try {
        if (state.currentUser?.role === 'student') {
          const modulesResponse = await fetch(
            `${API_URL}/api/v2/courses/${courseId}/modules`,
            {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            },
          );

          if (modulesResponse.ok) {
            const modulesApiResponse = await modulesResponse.json();
            const modulesWithFiles =
              modulesApiResponse.data || modulesApiResponse;

            const filesData = modulesWithFiles.flatMap((module: any) =>
              (module.materials || module.files || []).map((file: any) => ({
                ...file,
                moduleId: module.id,
                moduleName: module.title,
              })),
            );

            const transformedMaterials: Material[] = filesData
              .filter((file: any) => file && file.id)
              .map((file: any) => ({
                id: file.id,
                title: file.title || file.name || 'Unknown File',
                type: getFileType(file.file_type || file.type || ''),
                size: file.size || formatFileSize(file.file_size || 0),
                uploadedAt: formatRelativeTime(
                  file.uploadedAt ||
                    file.created_at ||
                    new Date().toISOString(),
                ),
                processed: file.processed !== false,
                moduleId: file.moduleId,
                moduleName: file.moduleName,
              }));

            const organizedModules = createModuleStructure(
              modulesWithFiles,
              transformedMaterials,
              courseId,
            );
            dispatch(courseActions.setModules(organizedModules));
          }
        }
      } catch (refreshError) {
        console.error('Failed to refresh modules:', refreshError);
      }

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
      // Call the appropriate API based on user role
      if (state.currentUser?.role === 'student') {
        await studentAPI.deleteFile(fileId);
      } else {
        await instructorAPI.deleteFile(fileId);
      }

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
      // Delete files one by one (could be optimized with batch API)
      for (const fileId of fileIds) {
        if (state.currentUser?.role === 'student') {
          await studentAPI.deleteFile(fileId);
        } else {
          await instructorAPI.deleteFile(fileId);
        }
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
