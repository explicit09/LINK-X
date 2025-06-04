import { studentAPI } from '@/lib/api';
import { UploadFile, UploadStage } from '../types';
import { formatFileSize } from '../utils/fileUtils';
import { toast as sonnerToast } from 'sonner';

export const uploadIndividualFile = async (
  uploadFile: UploadFile,
  courseId: string | undefined,
  moduleId: string | undefined,
  onProgress: (
    fileId: string,
    progress: number,
    status: UploadFile['status'],
    stage?: string,
  ) => void,
  onComplete: (result: any) => void,
) => {
  const fileId = uploadFile.id;

  try {
    if (!courseId) {
      throw new Error('Course ID is required for individual file uploads');
    }

    if (!moduleId) {
      throw new Error('Module ID is required for file uploads. Please select or create a module first.');
    }

    console.log('Starting file upload:', {
      courseId,
      moduleId,
      fileName: uploadFile.file.name,
      fileSize: uploadFile.file.size,
      fileType: uploadFile.file.type
    });

    // Update status to uploading
    onProgress(fileId, 0, 'uploading');

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', uploadFile.file);
    formData.append('title', uploadFile.file.name);
    formData.append('description', `Student upload: ${uploadFile.file.name}`);
    formData.append('moduleId', moduleId);

    console.log('Calling uploadFile API with moduleId:', moduleId);

    // Upload to student's course and parse JSON response
    const response = await studentAPI.uploadFile(moduleId, formData);
    
    console.log('Upload API response:', response);
    
    const result = typeof response === 'object' ? response : await response.json();
    
    console.log('Parsed upload result:', result);

    // Simulate progress during upload
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 25;
      if (progress <= 100) {
        onProgress(
          fileId,
          progress,
          progress === 100 ? 'processing' : 'uploading',
        );
      }
    }, 300);

    setTimeout(() => {
      clearInterval(progressInterval);

      // Complete upload
      onProgress(fileId, 100, 'completed', 'Upload complete!');

      // Call success callback with normalized data
      onComplete({
        id: result.id,
        title: result.title || uploadFile.file.name,
        filename: result.filename || uploadFile.file.name,
        file_type: result.file_type || uploadFile.file.type,
        file_size: result.file_size || uploadFile.file.size,
        type: uploadFile.file.type.includes('pdf')
          ? 'pdf'
          : uploadFile.file.type.includes('audio')
            ? 'audio'
            : uploadFile.file.type.includes('video')
              ? 'video'
              : 'document',
        size: formatFileSize(result.file_size || uploadFile.file.size),
        uploadedAt: 'Just now',
        processed: true,
        moduleId: result.module_id || moduleId,
        module_id: result.module_id || moduleId,
      });
      sonnerToast.success(`${uploadFile.file.name} uploaded successfully!`);
    }, 2000);
  } catch (error) {
    console.error('Individual file upload error:', error);
    throw error;
  }
};

export const uploadPackage = async (
  uploadFile: UploadFile,
  onProgress: (
    fileId: string,
    progress: number,
    status: UploadFile['status'],
    stage?: string,
  ) => void,
  onComplete: (result: any) => void,
) => {
  const fileId = uploadFile.id;

  try {
    // Update status to uploading
    onProgress(fileId, 0, 'uploading');

    // Create FormData for package upload
    const formData = new FormData();
    formData.append('package', uploadFile.file);
    formData.append('extractContents', 'true');

    // Upload course package
    const result = await studentAPI.uploadCoursePackage(formData);

    // Simulate progress during upload and extraction
    const stages: UploadStage[] = [
      { progress: 20, stage: 'Uploading package...' },
      { progress: 40, stage: 'Extracting contents...' },
      { progress: 60, stage: 'Processing course structure...' },
      { progress: 80, stage: 'Creating course materials...' },
      { progress: 100, stage: 'Course creation complete!' },
    ];

    for (let i = 0; i < stages.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onProgress(
        fileId,
        stages[i].progress,
        stages[i].progress === 100 ? 'completed' : 'processing',
        stages[i].stage,
      );
    }

    // Call success callback
    onComplete(result);
    sonnerToast.success(
      `Course package ${uploadFile.file.name} processed successfully!`,
    );
  } catch (error) {
    console.error('Course package upload error:', error);
    throw error;
  }
};
