'use client';

import { useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';
import { EnhancedFileUploadProps, UploadFile } from './types';
import { useFileUpload, useDragAndDrop } from './hooks';
import { DropZone, FileList } from './components';
import { UploadService } from './services/uploadService';
import { validateFileType } from './utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Upload, BookOpen, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className={cn('space-y-6', className)}>
      {/* Canvas-style Header */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Add Learning Materials</h2>
              <p className="text-gray-600">
                Upload files to enhance this module with rich learning content
              </p>
            </div>
          </div>
          
          {/* Progress Steps Indicator */}
          <div className="flex items-center gap-2 pt-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
              <Upload className="w-4 h-4" />
              Select Files
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              uploadFiles.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <CheckCircle className="w-4 h-4" />
              Process & Index
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              uploadFiles.some(f => f.status === 'completed') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <BookOpen className="w-4 h-4" />
              Ready for Learning
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Upload Drop Zone */}
      <DropZone
        isDragOver={isDragOver}
        onDrop={handleDropWrapper}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onFileSelect={handleFileSelect}
      />

      {/* File Upload Progress */}
      {uploadFiles.length > 0 && (
        <FileList
          uploadFiles={uploadFiles}
          onRemove={removeFile}
          onRetry={retryUpload}
        />
      )}
    </div>
  );
}
