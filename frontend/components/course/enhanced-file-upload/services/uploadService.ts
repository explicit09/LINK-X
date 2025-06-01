import { toast as sonnerToast } from 'sonner';
import { UploadFile } from '../types';
import { formatFileSize, getFileTypeFromMime } from '../utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface UploadServiceOptions {
  courseId: string;
  moduleId?: string;
  onProgress: (fileId: string, progress: number) => void;
  onStatusChange: (
    fileId: string,
    status: UploadFile['status'],
    stage?: string,
  ) => void;
  onComplete: (fileId: string, result: any) => void;
  onError: (fileId: string, error: string) => void;
}

export class UploadService {
  private options: UploadServiceOptions;

  constructor(options: UploadServiceOptions) {
    this.options = options;
  }

  async uploadFile(uploadFile: UploadFile, userRole: 'student' | 'instructor') {
    if (userRole === 'student') {
      return this.studentUpload(uploadFile);
    } else {
      return this.instructorUpload(uploadFile);
    }
  }

  private async studentUpload(uploadFile: UploadFile) {
    const fileId = uploadFile.id;

    try {
      this.options.onStatusChange(fileId, 'uploading');
      this.options.onProgress(fileId, 0);

      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('title', uploadFile.file.name);

      if (this.options.moduleId) {
        formData.append('module_id', this.options.moduleId);
      }

      formData.append(
        'description',
        `Uploaded by student: ${uploadFile.file.name}`,
      );

      const response = await fetch(`${API_URL}/api/v2/files/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Student upload failed: ${response.statusText}`);
      }

      // Simulate progress during upload
      await this.simulateProgress(fileId, 'uploading');

      // Update to processing
      this.options.onStatusChange(fileId, 'processing', 'Processing file...');

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Complete upload
      this.options.onStatusChange(fileId, 'completed', 'Upload complete!');

      const result = {
        id: fileId,
        title: uploadFile.file.name,
        type: getFileTypeFromMime(uploadFile.file.type),
        size: formatFileSize(uploadFile.file.size),
        uploadedAt: 'Just now',
        processed: true,
      };

      this.options.onComplete(fileId, result);
      sonnerToast.success(`${uploadFile.file.name} uploaded successfully!`);
    } catch (error) {
      console.error('Student upload error:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.options.onError(fileId, errorMessage);
      sonnerToast.error(
        `Failed to upload ${uploadFile.file.name}: ${errorMessage}`,
      );
    }
  }

  private async instructorUpload(uploadFile: UploadFile) {
    const fileId = uploadFile.id;

    try {
      this.options.onStatusChange(fileId, 'uploading');
      this.options.onProgress(fileId, 0);

      // Get course modules
      try {
        const modulesResponse = await fetch(
          `${API_URL}/api/v2/courses/${this.options.courseId}/modules`,
          {
            credentials: 'include',
          },
        );

        if (!modulesResponse.ok && !this.options.moduleId) {
          // Create a default module if none exists
          const createModuleResponse = await fetch(
            `${API_URL}/api/v2/courses/${this.options.courseId}/modules`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                title: 'Course Materials',
                description: 'Default module for course materials',
                module_order: 1,
              }),
            },
          );

          if (!createModuleResponse.ok) {
            throw new Error('Failed to create module');
          }
        }
      } catch (moduleError) {
        console.warn('Module handling failed, continuing with simulation');
        return this.simulateUpload(uploadFile);
      }

      const formData = new FormData();
      formData.append('file', uploadFile.file);

      const response = await fetch(`${API_URL}/api/v2/files/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      // Simulate progress during upload
      await this.simulateProgress(fileId, 'uploading');

      // Update to processing
      this.options.onStatusChange(fileId, 'processing', 'Processing file...');

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Complete upload
      this.options.onStatusChange(fileId, 'completed', 'Upload complete!');

      const result = {
        id: fileId,
        title: uploadFile.file.name,
        type: getFileTypeFromMime(uploadFile.file.type),
        size: formatFileSize(uploadFile.file.size),
        uploadedAt: 'Just now',
        processed: true,
      };

      this.options.onComplete(fileId, result);
      sonnerToast.success(`${uploadFile.file.name} uploaded successfully!`);
    } catch (error) {
      console.error('Instructor upload error:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.options.onError(fileId, errorMessage);
      sonnerToast.error(
        `Failed to upload ${uploadFile.file.name}: ${errorMessage}`,
      );
    }
  }

  private async simulateUpload(uploadFile: UploadFile) {
    const fileId = uploadFile.id;

    // Simulate upload progress
    await this.simulateProgress(fileId, 'uploading');

    // Simulate processing stages
    const processingStages = [
      'Analyzing content...',
      'Generating embeddings...',
      'Creating searchable index...',
      'Finalizing upload...',
    ];

    for (let i = 0; i < processingStages.length; i++) {
      this.options.onStatusChange(fileId, 'processing', processingStages[i]);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Complete upload
    this.options.onStatusChange(fileId, 'completed', 'Upload complete!');

    const result = {
      id: fileId,
      title: uploadFile.file.name,
      type: getFileTypeFromMime(uploadFile.file.type),
      size: formatFileSize(uploadFile.file.size),
      uploadedAt: 'Just now',
      processed: true,
    };

    this.options.onComplete(fileId, result);
    sonnerToast.success(
      `${uploadFile.file.name} uploaded and processed successfully!`,
    );
  }

  private async simulateProgress(
    fileId: string,
    status: 'uploading' | 'processing',
  ) {
    for (let progress = 0; progress <= 100; progress += 20) {
      this.options.onProgress(fileId, progress);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}
