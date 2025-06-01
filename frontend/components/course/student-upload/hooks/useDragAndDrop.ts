import { useState, useCallback } from 'react';
import { UploadType } from '../types';

export const useDragAndDrop = (
  handleFiles: (files: FileList, uploadType: UploadType) => void,
  activeTab: string,
) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      if (files) {
        handleFiles(files, activeTab as UploadType);
      }
    },
    [handleFiles, activeTab],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  return {
    isDragOver,
    handleDrop,
    handleDragOver,
    handleDragLeave,
  };
};
