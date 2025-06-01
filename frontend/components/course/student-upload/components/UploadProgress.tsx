import React from 'react';
import { UploadFile } from '../types';
import { FileItem } from './FileItem';

interface UploadProgressProps {
  uploadFiles: UploadFile[];
  onRemove: (fileId: string) => void;
  onRetry: (fileId: string) => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  uploadFiles,
  onRemove,
  onRetry,
}) => {
  if (uploadFiles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="canvas-heading-3">Upload Progress</h3>
      {uploadFiles.map((uploadFile) => (
        <FileItem
          key={uploadFile.id}
          uploadFile={uploadFile}
          onRemove={onRemove}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
};
