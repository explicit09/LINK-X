import { useState, useCallback } from 'react';
import { UploadFile, UploadType } from '../types';
import { validateFile, generateFileId } from '../utils';
import { uploadIndividualFile, uploadPackage } from '../services/uploadService';
import { toast as sonnerToast } from 'sonner';

export const useFileUpload = (
  courseId?: string,
  moduleId?: string,
  onUploadComplete?: (result: any) => void
) => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);

  const updateFileStatus = useCallback((
    fileId: string,
    progress: number,
    status: UploadFile['status'],
    processingStage?: string,
    error?: string
  ) => {
    setUploadFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status, progress, processingStage, error }
        : f
    ));
  }, []);

  const handleUpload = useCallback(async (uploadFile: UploadFile, uploadType: UploadType) => {
    try {
      if (uploadType === 'individual') {
        await uploadIndividualFile(
          uploadFile,
          courseId,
          moduleId,
          updateFileStatus,
          onUploadComplete || (() => {})
        );
      } else {
        await uploadPackage(
          uploadFile,
          updateFileStatus,
          onUploadComplete || (() => {})
        );
      }
    } catch (error) {
      updateFileStatus(
        uploadFile.id,
        0,
        "error",
        undefined,
        error instanceof Error ? error.message : "Upload failed"
      );
      sonnerToast.error(`Failed to upload ${uploadFile.file.name}`);
    }
  }, [courseId, moduleId, onUploadComplete, updateFileStatus]);

  const handleFiles = useCallback((files: FileList, uploadType: UploadType) => {
    Array.from(files).forEach(file => {
      const error = validateFile(file, uploadType);
      if (error) {
        sonnerToast.error(error);
        return;
      }

      const uploadFile: UploadFile = {
        id: generateFileId(),
        file,
        status: "uploading",
        progress: 0,
      };

      setUploadFiles(prev => [...prev, uploadFile]);
      handleUpload(uploadFile, uploadType);
    });
  }, [handleUpload]);

  const removeFile = useCallback((fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const retryUpload = useCallback((fileId: string, uploadType: UploadType) => {
    const uploadFile = uploadFiles.find(f => f.id === fileId);
    if (uploadFile) {
      updateFileStatus(fileId, 0, "uploading");
      handleUpload(uploadFile, uploadType);
    }
  }, [uploadFiles, updateFileStatus, handleUpload]);

  return {
    uploadFiles,
    handleFiles,
    removeFile,
    retryUpload
  };
};