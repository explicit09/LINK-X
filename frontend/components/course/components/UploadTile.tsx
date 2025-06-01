import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, Plus, File } from 'lucide-react';
import { cn } from '@/lib/utils';

import { UploadProgress } from '../hooks/useFileUpload';

interface UploadTileProps {
  moduleId: string;
  isUploading?: boolean;
  uploadProgress?: UploadProgress | null;
  isDragging?: boolean;
  canUpload?: boolean;
  onFileSelect: (moduleId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (moduleId: string, e: React.DragEvent) => void;
  onDragLeave: (moduleId: string, e: React.DragEvent) => void;
  onDrop: (moduleId: string, e: React.DragEvent) => void;
  setFileInputRef: (moduleId: string, ref: HTMLInputElement | null) => void;
  onFileInputChange: (
    moduleId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  className?: string;
}

export function UploadTile({
  moduleId,
  isUploading = false,
  uploadProgress,
  isDragging = false,
  canUpload = false,
  onFileSelect,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  setFileInputRef,
  onFileInputChange,
  className = '',
}: UploadTileProps) {
  if (!canUpload) {
    return null;
  }

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200',
        isDragging
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
        isUploading && 'pointer-events-none opacity-60',
        className,
      )}
      onDragOver={onDragOver}
      onDragEnter={(e) => onDragEnter(moduleId, e)}
      onDragLeave={(e) => onDragLeave(moduleId, e)}
      onDrop={(e) => onDrop(moduleId, e)}
    >
      <input
        type="file"
        ref={(ref) => setFileInputRef(moduleId, ref)}
        onChange={(e) => onFileInputChange(moduleId, e)}
        className="hidden"
        multiple
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.mp3,.wav,.mp4"
      />

      {isUploading && uploadProgress ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <Upload className="h-8 w-8 text-blue-500 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              Uploading {uploadProgress.fileName}
            </p>
            <div className="mt-2">
              <Progress value={uploadProgress.progress} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">
                {uploadProgress.progress}% complete
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            {isDragging ? (
              <Upload className="h-12 w-12 text-blue-500" />
            ) : (
              <div className="p-3 bg-gray-100 rounded-full">
                <Plus className="h-6 w-6 text-gray-600" />
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">
              {isDragging ? 'Drop files here' : 'Upload materials'}
            </h4>
            <p className="text-xs text-gray-500 mb-3">
              {isDragging
                ? 'Release to upload'
                : 'Drag & drop files or click to browse'}
            </p>

            {!isDragging && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFileSelect(moduleId)}
                className="text-xs"
              >
                <File className="h-3 w-3 mr-1" />
                Choose Files
              </Button>
            )}
          </div>

          <div className="text-xs text-gray-400">
            <p>Supported formats:</p>
            <p>PDF, Word, Text, Images, Audio, Video</p>
            <p>Max file size: 50MB</p>
          </div>
        </div>
      )}
    </div>
  );
}
