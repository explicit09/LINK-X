import { useState, useCallback } from 'react';
import { UploadFile } from '../types';
import { validateFileType } from '../utils';

export function useFileUpload() {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);

  const addFile = useCallback((file: File): UploadFile | null => {
    const validationError = validateFileType(file);
    if (validationError) {
      return null;
    }

    const uploadFile: UploadFile = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      file,
      status: 'uploading',
      progress: 0,
    };

    setUploadFiles((prev) => [...prev, uploadFile]);
    return uploadFile;
  }, []);

  const updateFile = useCallback(
    (fileId: string, updates: Partial<UploadFile>) => {
      setUploadFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, ...updates } : f)),
      );
    },
    [],
  );

  const removeFile = useCallback((fileId: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const getFile = useCallback(
    (fileId: string): UploadFile | undefined => {
      return uploadFiles.find((f) => f.id === fileId);
    },
    [uploadFiles],
  );

  return {
    uploadFiles,
    addFile,
    updateFile,
    removeFile,
    getFile,
  };
}
