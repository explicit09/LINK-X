import { useState } from 'react';
import { instructorAPI } from '@/lib/api';
import { toast } from 'sonner';
import { File } from './useModules';

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
  const [moduleFiles, setModuleFiles] = useState<Record<string, FileSummary[]>>(
    {},
  );
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());

  // Upload file to module
  const uploadFile = async (
    moduleId: string,
    file: File,
  ): Promise<UploadResult> => {
    try {
      setUploadingFiles((prev) => new Set(prev).add(moduleId));

      const result = await instructorAPI.uploadFile(moduleId, file);

      // Update module files cache
      setModuleFiles((prev) => ({
        ...prev,
        [moduleId]: [...(prev[moduleId] || []), result],
      }));

      toast.success('File uploaded successfully');
      return { success: true, file: result };
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

  // Upload audio file to module
  const uploadAudioFile = async (
    moduleId: string,
    audioFile: File,
  ): Promise<UploadResult> => {
    try {
      setUploadingFiles((prev) => new Set(prev).add(`audio-${moduleId}`));

      const result = await instructorAPI.uploadAudioFile(moduleId, audioFile);

      // Update module files cache
      setModuleFiles((prev) => ({
        ...prev,
        [moduleId]: [...(prev[moduleId] || []), result],
      }));

      toast.success('Audio file uploaded successfully');
      return { success: true, file: result };
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
      await instructorAPI.deleteFile(fileId);

      // Update module files cache
      setModuleFiles((prev) => ({
        ...prev,
        [moduleId]: (prev[moduleId] || []).filter((file) => file.id !== fileId),
      }));

      toast.success('File deleted successfully');
      return true;
    } catch (err) {
      console.error('Error deleting file:', err);
      toast.error('Failed to delete file');
      return false;
    }
  };

  // Load files for a module
  const loadModuleFiles = async (moduleId: string): Promise<FileSummary[]> => {
    try {
      setLoadingFiles((prev) => new Set(prev).add(moduleId));

      const files = await instructorAPI.getModuleFiles(moduleId);

      setModuleFiles((prev) => ({
        ...prev,
        [moduleId]: files,
      }));

      return files;
    } catch (err) {
      console.error('Error loading module files:', err);
      toast.error('Failed to load module files');
      return [];
    } finally {
      setLoadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(moduleId);
        return newSet;
      });
    }
  };

  // Get files for a module
  const getModuleFiles = (moduleId: string): FileSummary[] => {
    return moduleFiles[moduleId] || [];
  };

  // Check if uploading for module
  const isUploading = (
    moduleId: string,
    type: 'file' | 'audio' = 'file',
  ): boolean => {
    const key = type === 'audio' ? `audio-${moduleId}` : moduleId;
    return uploadingFiles.has(key);
  };

  // Check if loading files for module
  const isLoadingFiles = (moduleId: string): boolean => {
    return loadingFiles.has(moduleId);
  };

  return {
    uploadFile,
    uploadAudioFile,
    deleteFile,
    loadModuleFiles,
    getModuleFiles,
    isUploading,
    isLoadingFiles,
    moduleFiles,
  };
}
