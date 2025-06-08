import { useState } from 'react';
import { toast } from 'sonner';
import { File } from './useModules';
import { fileOperations } from '@/lib/db/operations';
import { useFiles } from '@/lib/hooks/useDatabase';

export interface FileSummary {
  id: string;
  title: string;
  filename: string;
}

export interface UploadResult {
  success: boolean;
  file?: File;
  error?: string;
}

export function useFileManagement() {
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  // Upload file to module
  const uploadFile = async (
    moduleId: string,
    file: globalThis.File, // Use globalThis.File for DOM File API
  ): Promise<UploadResult> => {
    try {
      setUploadingFiles((prev) => new Set(prev).add(moduleId));

      // ✅ NEW: Use direct Supabase operations with AI processing
      const result = await fileOperations.uploadFile(file, moduleId, file.name);

      toast.success('File uploaded successfully');
      return { 
        success: true, 
        file: {
          id: result.id,
          title: result.title,
          filename: result.filename,
        }
      };
    } catch (err) {
      console.error('Error uploading file:', err);
      toast.error('Failed to upload file');
      return { success: false, error: 'Upload failed' };
    } finally {
      setUploadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(moduleId);
        return newSet;
      });
    }
  };

  // Upload audio file to module (same as regular file upload)
  const uploadAudioFile = async (
    moduleId: string,
    audioFile: globalThis.File,
  ): Promise<UploadResult> => {
    try {
      setUploadingFiles((prev) => new Set(prev).add(`audio-${moduleId}`));

      // ✅ NEW: Use direct Supabase operations (same as regular file)
      const result = await fileOperations.uploadFile(audioFile, moduleId, audioFile.name);

      toast.success('Audio file uploaded successfully');
      return { 
        success: true, 
        file: {
          id: result.id,
          title: result.title,
          filename: result.filename,
        }
      };
    } catch (err) {
      console.error('Error uploading audio file:', err);
      toast.error('Failed to upload audio file');
      return { success: false, error: 'Audio upload failed' };
    } finally {
      setUploadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(`audio-${moduleId}`);
        return newSet;
      });
    }
  };

  // Delete file
  const deleteFile = async (
    fileId: string,
    moduleId: string,
  ): Promise<boolean> => {
    try {
      // ✅ NEW: Use direct Supabase operations
      await fileOperations.deleteFile(fileId);

      toast.success('File deleted successfully');
      return true;
    } catch (err) {
      console.error('Error deleting file:', err);
      toast.error('Failed to delete file');
      return false;
    }
  };

  // Load files for a module (use the hook instead)
  const loadModuleFiles = async (moduleId: string): Promise<FileSummary[]> => {
    try {
      // ✅ NEW: Use direct Supabase operations
      const files = await fileOperations.getModuleFiles(moduleId);

      return files.map(file => ({
        id: file.id,
        title: file.title,
        filename: file.filename,
      }));
    } catch (err) {
      console.error('Error loading module files:', err);
      toast.error('Failed to load module files');
      return [];
    }
  };

  // Get files for a module - recommend using useFiles hook instead
  const getModuleFiles = (moduleId: string): FileSummary[] => {
    // ✅ NOTE: This is deprecated - use useFiles(moduleId) hook instead
    console.warn('getModuleFiles is deprecated - use useFiles(moduleId) hook for real-time updates');
    return [];
  };

  // Check if uploading for module
  const isUploading = (
    moduleId: string,
    type: 'file' | 'audio' = 'file',
  ): boolean => {
    const key = type === 'audio' ? `audio-${moduleId}` : moduleId;
    return uploadingFiles.has(key);
  };

  // Check if loading files for module - deprecated
  const isLoadingFiles = (moduleId: string): boolean => {
    // ✅ NOTE: Use useFiles(moduleId).loading instead
    return false;
  };

  return {
    uploadFile,
    uploadAudioFile,
    deleteFile,
    loadModuleFiles,
    getModuleFiles, // Deprecated
    isUploading,
    isLoadingFiles, // Deprecated
    moduleFiles: {}, // Deprecated - use useFiles hook
  };
}
