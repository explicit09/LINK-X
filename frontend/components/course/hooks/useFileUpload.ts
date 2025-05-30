import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Material } from './useModuleManager';

export interface UploadProgress {
  moduleId: string;
  fileName: string;
  progress: number;
  isUploading: boolean;
}

export interface FileUploadOptions {
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
  onProgress?: (progress: number) => void;
  onComplete?: (material: Material) => void;
  onError?: (error: string) => void;
}

export function useFileUpload(courseId: string, userRole: 'instructor' | 'student' = 'student') {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
  const [dragStates, setDragStates] = useState<Map<string, boolean>>(new Map());
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const canUpload = userRole === 'instructor' || userRole === 'student';

  // File validation
  const validateFile = useCallback((file: File, options?: FileUploadOptions): string | null => {
    const maxSize = (options?.maxFileSize || 50) * 1024 * 1024; // Convert MB to bytes
    const allowedTypes = options?.allowedTypes || [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/jpeg',
      'image/png',
      'audio/mpeg',
      'audio/wav',
      'video/mp4'
    ];

    if (file.size > maxSize) {
      return `File size must be less than ${options?.maxFileSize || 50}MB`;
    }

    if (!allowedTypes.includes(file.type)) {
      return 'File type not supported';
    }

    return null;
  }, []);

  // Upload file to module
  const uploadFile = useCallback(async (
    moduleId: string, 
    file: File, 
    options?: FileUploadOptions
  ): Promise<Material | null> => {
    if (!canUpload) {
      toast.error('You do not have permission to upload files');
      return null;
    }

    // Validate file
    const validationError = validateFile(file, options);
    if (validationError) {
      toast.error(validationError);
      options?.onError?.(validationError);
      return null;
    }

    const uploadId = `${moduleId}-${Date.now()}`;
    
    // Initialize upload progress
    setUploads(prev => new Map(prev).set(uploadId, {
      moduleId,
      fileName: file.name,
      progress: 0,
      isUploading: true
    }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('moduleId', moduleId);
      formData.append('courseId', courseId);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploads(prev => {
            const newMap = new Map(prev);
            const uploadData = newMap.get(uploadId);
            if (uploadData) {
              newMap.set(uploadId, { ...uploadData, progress });
            }
            return newMap;
          });
          options?.onProgress?.(progress);
        }
      });

      // Handle completion
      return new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          setUploads(prev => {
            const newMap = new Map(prev);
            newMap.delete(uploadId);
            return newMap;
          });

          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              const material: Material = {
                id: response.id,
                title: response.title || file.name,
                fileType: file.type,
                uploadDate: new Date().toISOString(),
                fileSize: file.size,
                thumbnailUrl: response.thumbnailUrl,
                downloadUrl: response.downloadUrl,
                chunkCount: response.chunkCount,
                uploadTime: new Date().toLocaleString(),
              };

              toast.success('File uploaded successfully');
              options?.onComplete?.(material);
              resolve(material);
            } catch (err) {
              const error = 'Failed to parse upload response';
              toast.error(error);
              options?.onError?.(error);
              reject(new Error(error));
            }
          } else {
            const error = `Upload failed: ${xhr.statusText}`;
            toast.error(error);
            options?.onError?.(error);
            reject(new Error(error));
          }
        });

        xhr.addEventListener('error', () => {
          setUploads(prev => {
            const newMap = new Map(prev);
            newMap.delete(uploadId);
            return newMap;
          });

          const error = 'Upload failed due to network error';
          toast.error(error);
          options?.onError?.(error);
          reject(new Error(error));
        });

        xhr.open('POST', `/api/courses/${courseId}/modules/${moduleId}/upload`);
        xhr.send(formData);
      });

    } catch (err) {
      setUploads(prev => {
        const newMap = new Map(prev);
        newMap.delete(uploadId);
        return newMap;
      });

      const error = err instanceof Error ? err.message : 'Upload failed';
      console.error('Upload error:', err);
      toast.error(error);
      options?.onError?.(error);
      return null;
    }
  }, [courseId, canUpload, validateFile]);

  // Handle file input change
  const handleFileInputChange = useCallback((
    moduleId: string, 
    event: React.ChangeEvent<HTMLInputElement>,
    options?: FileUploadOptions
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      uploadFile(moduleId, file, options);
    });

    // Reset file input
    event.target.value = '';
  }, [uploadFile]);

  // Handle drag and drop
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragEnter = useCallback((moduleId: string, event: React.DragEvent) => {
    event.preventDefault();
    setDragStates(prev => new Map(prev).set(moduleId, true));
  }, []);

  const handleDragLeave = useCallback((moduleId: string, event: React.DragEvent) => {
    event.preventDefault();
    // Only set to false if we're leaving the drop zone completely
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setDragStates(prev => new Map(prev).set(moduleId, false));
    }
  }, []);

  const handleDrop = useCallback((
    moduleId: string, 
    event: React.DragEvent,
    options?: FileUploadOptions
  ) => {
    event.preventDefault();
    setDragStates(prev => new Map(prev).set(moduleId, false));

    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      uploadFile(moduleId, file, options);
    });
  }, [uploadFile]);

  // Trigger file input
  const triggerFileInput = useCallback((moduleId: string) => {
    const input = fileInputRefs.current.get(moduleId);
    if (input) {
      input.click();
    }
  }, []);

  // Set file input ref
  const setFileInputRef = useCallback((moduleId: string, ref: HTMLInputElement | null) => {
    if (ref) {
      fileInputRefs.current.set(moduleId, ref);
    } else {
      fileInputRefs.current.delete(moduleId);
    }
  }, []);

  // Get upload progress for module
  const getUploadProgress = useCallback((moduleId: string): UploadProgress | null => {
    for (const [_, upload] of uploads) {
      if (upload.moduleId === moduleId) {
        return upload;
      }
    }
    return null;
  }, [uploads]);

  // Check if module is uploading
  const isModuleUploading = useCallback((moduleId: string): boolean => {
    return getUploadProgress(moduleId)?.isUploading || false;
  }, [getUploadProgress]);

  // Get drag state for module
  const isModuleDragging = useCallback((moduleId: string): boolean => {
    return dragStates.get(moduleId) || false;
  }, [dragStates]);

  return {
    // Upload functions
    uploadFile,
    handleFileInputChange,
    
    // Drag and drop
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    
    // File input management
    triggerFileInput,
    setFileInputRef,
    
    // State queries
    getUploadProgress,
    isModuleUploading,
    isModuleDragging,
    
    // Permissions
    canUpload,
    
    // Validation
    validateFile,
    
    // All uploads
    uploads: Array.from(uploads.values()),
  };
}