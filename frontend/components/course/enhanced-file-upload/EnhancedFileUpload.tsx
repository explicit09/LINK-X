'use client';

import { useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';
import { EnhancedFileUploadProps, UploadFile } from './types';
import { useFileUpload, useDragAndDrop } from './hooks';
import { DropZone, FileList } from './components';
import { UploadService } from './services/uploadService';
import { validateFileType } from './utils';

export function EnhancedFileUpload({
  courseId,
  moduleId,
  userRole = 'student',
  onUploadComplete,
  className,
}: EnhancedFileUploadProps) {
  const { uploadFiles, addFile, updateFile, removeFile, getFile } =
    useFileUpload();
  const { isDragOver, handleDrop, handleDragOver, handleDragLeave } =
    useDragAndDrop();

  // Create upload service instance
  const uploadService = new UploadService({
    courseId,
    moduleId,
    onProgress: (fileId, progress) => {
      updateFile(fileId, { progress });
    },
    onStatusChange: (fileId, status, stage) => {
      updateFile(fileId, { status, processingStage: stage });
    },
    onComplete: (fileId, result) => {
      updateFile(fileId, {
        status: 'completed',
        processingStage: 'Upload complete!',
      });
      onUploadComplete?.(result);
    },
    onError: (fileId, error) => {
      updateFile(fileId, { status: 'error', error });
    },
  });

  const handleFiles = useCallback(
    (files: FileList) => {
      Array.from(files).forEach((file) => {
        const validationError = validateFileType(file);
        if (validationError) {
          sonnerToast.error(validationError);
          return;
        }

        const uploadFile = addFile(file);
        if (uploadFile) {
          uploadService.uploadFile(uploadFile, userRole);
        }
      });
    },
    [addFile, uploadService, userRole],
  );

  const handleDropWrapper = useCallback(
    (e: React.DragEvent) => {
      handleDrop(e, handleFiles);
    },
    [handleDrop, handleFiles],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) handleFiles(files);
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    },
    [handleFiles],
  );

  const retryUpload = useCallback(
    (fileId: string) => {
      const uploadFile = getFile(fileId);
      if (uploadFile) {
        updateFile(fileId, {
          status: 'uploading',
          progress: 0,
          error: undefined,
        });
        uploadService.uploadFile(uploadFile, userRole);
      }
    },
    [getFile, updateFile, uploadService, userRole],
  );

  return (
    <div className={className}>
      <DropZone
        isDragOver={isDragOver}
        onDrop={handleDropWrapper}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onFileSelect={handleFileSelect}
      />

      <FileList
        uploadFiles={uploadFiles}
        onRemove={removeFile}
        onRetry={retryUpload}
      />
    </div>
  );
}
