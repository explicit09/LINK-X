import { toast as sonnerToast } from 'sonner';
import { UploadFile } from '../types';
import { formatFileSize, getFileTypeFromMime } from '../utils';
import { supabase } from '@/supabaseconfig';
import { v4 as uuidv4 } from 'uuid';
import { ensureStorageBucket } from '@/lib/utils/ensureStorageBucket';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Helper functions for auth
const getAuthToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

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

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Generate unique file path
      const fileExt = uploadFile.file.name.split('.').pop() || 'pdf';
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${this.options.courseId}/${this.options.moduleId || 'general'}/${fileName}`;

      // Upload to Supabase Storage
      this.options.onProgress(fileId, 20);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('course-files')
        .upload(filePath, uploadFile.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // Check if it's a bucket not found error
        if (uploadError.message?.includes('Bucket not found')) {
          await ensureStorageBucket(); // This will show instructions
          throw new Error(
            'Storage not configured. Please contact your administrator to set up the file storage bucket.'
          );
        }
        throw uploadError;
      }

      this.options.onProgress(fileId, 60);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('course-files')
        .getPublicUrl(filePath);

      // Create file record in database
      this.options.onStatusChange(fileId, 'processing', 'Creating file record...');
      
      const { data: fileRecord, error: dbError } = await supabase
        .from('files')
        .insert({
          title: uploadFile.file.name,
          filename: uploadFile.file.name,
          file_type: getFileTypeFromMime(uploadFile.file.type),
          file_size: uploadFile.file.size,
          module_id: this.options.moduleId || null,
          storage_path: filePath,  // Add storage_path
          s3_key: filePath,
          s3_bucket: 'course-files',
          storage_type: 'supabase'
        })
        .select()
        .single();

      if (dbError) {
        // Try to clean up the uploaded file
        await supabase.storage
          .from('course-files')
          .remove([filePath]);
        throw dbError;
      }

      this.options.onProgress(fileId, 80);

      // Award XP for uploading content
      await supabase.from('user_activities').insert({
        user_id: user.id,
        activity_type: 'file_upload',
        xp_earned: 10,
        metadata: {
          file_id: fileRecord.id,
          file_name: uploadFile.file.name,
          course_id: this.options.courseId
        }
      });

      this.options.onProgress(fileId, 90);
      
      // Trigger backend processing for AI features (chunking, embeddings)
      try {
        this.options.onStatusChange(fileId, 'processing', 'Queuing for AI processing...');
        
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/api/v2/files/${fileRecord.id}/process`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            priority: 'normal',
            processing_type: 'full' // full processing: text extraction, chunking, embeddings
          })
        });

        if (!response.ok) {
          console.warn('Backend processing request failed:', response.statusText);
          // Don't fail the upload - processing can be retried later
        } else {
          console.log('File processing queued successfully');
        }
      } catch (processError) {
        console.warn('Could not trigger backend processing:', processError);
        // Don't fail the upload - file is stored successfully
      }

      this.options.onProgress(fileId, 100);
      this.options.onStatusChange(fileId, 'completed', 'Upload complete! AI processing queued.');

      const result = {
        id: fileRecord.id,
        title: fileRecord.title,
        type: getFileTypeFromMime(fileRecord.file_type),
        size: formatFileSize(fileRecord.file_size),
        uploadedAt: 'Just now',
        processed: false, // Will be processed by backend workers
      };

      this.options.onComplete(fileId, result);
      sonnerToast.success(`${uploadFile.file.name} uploaded! AI processing started in background.`);
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

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check if we need to create a default module
      if (!this.options.moduleId) {
        const { data: modules } = await supabase
          .from('modules')
          .select('id')
          .eq('course_id', this.options.courseId)
          .limit(1);

        if (!modules || modules.length === 0) {
          // Create a default module
          const { data: newModule, error: moduleError } = await supabase
            .from('modules')
            .insert({
              title: 'Course Materials',
              description: 'Default module for course materials',
              course_id: this.options.courseId,
              ordering: 1
            })
            .select()
            .single();

          if (moduleError) {
            console.warn('Failed to create default module:', moduleError);
          } else {
            this.options.moduleId = newModule.id;
          }
        }
      }

      // Generate unique file path
      const fileExt = uploadFile.file.name.split('.').pop() || 'pdf';
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${this.options.courseId}/${this.options.moduleId || 'general'}/${fileName}`;

      // Upload to Supabase Storage
      this.options.onProgress(fileId, 20);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('course-files')
        .upload(filePath, uploadFile.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // Check if it's a bucket not found error
        if (uploadError.message?.includes('Bucket not found')) {
          await ensureStorageBucket(); // This will show instructions
          throw new Error(
            'Storage not configured. Please contact your administrator to set up the file storage bucket.'
          );
        }
        throw uploadError;
      }

      this.options.onProgress(fileId, 60);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('course-files')
        .getPublicUrl(filePath);

      // Create file record in database
      this.options.onStatusChange(fileId, 'processing', 'Creating file record...');
      
      const { data: fileRecord, error: dbError } = await supabase
        .from('files')
        .insert({
          title: uploadFile.file.name,
          filename: uploadFile.file.name,
          file_type: getFileTypeFromMime(uploadFile.file.type),
          file_size: uploadFile.file.size,
          module_id: this.options.moduleId || null,
          storage_path: filePath,  // Add storage_path
          s3_key: filePath,
          s3_bucket: 'course-files',
          storage_type: 'supabase'
        })
        .select()
        .single();

      if (dbError) {
        // Try to clean up the uploaded file
        await supabase.storage
          .from('course-files')
          .remove([filePath]);
        throw dbError;
      }

      this.options.onProgress(fileId, 80);

      // Award XP for uploading content (instructor gets more XP)
      await supabase.from('user_activities').insert({
        user_id: user.id,
        activity_type: 'file_upload',
        xp_earned: 25, // Instructors get more XP for uploading course materials
        metadata: {
          file_id: fileRecord.id,
          file_name: uploadFile.file.name,
          course_id: this.options.courseId,
          role: 'instructor'
        }
      });

      this.options.onProgress(fileId, 90);
      
      // Trigger backend processing for AI features (chunking, embeddings)
      try {
        this.options.onStatusChange(fileId, 'processing', 'Queuing for AI processing...');
        
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/api/v2/files/${fileRecord.id}/process`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            priority: 'high', // Instructors get higher priority
            processing_type: 'full' // full processing: text extraction, chunking, embeddings
          })
        });

        if (!response.ok) {
          console.warn('Backend processing request failed:', response.statusText);
          // Don't fail the upload - processing can be retried later
        } else {
          console.log('File processing queued successfully with high priority');
        }
      } catch (processError) {
        console.warn('Could not trigger backend processing:', processError);
        // Don't fail the upload - file is stored successfully
      }

      this.options.onProgress(fileId, 100);
      this.options.onStatusChange(fileId, 'completed', 'Upload complete! AI processing queued.');

      const result = {
        id: fileRecord.id,
        title: fileRecord.title,
        type: getFileTypeFromMime(fileRecord.file_type),
        size: formatFileSize(fileRecord.file_size),
        uploadedAt: 'Just now',
        processed: false, // Will be processed by backend workers
      };

      this.options.onComplete(fileId, result);
      sonnerToast.success(`${uploadFile.file.name} uploaded! AI processing started in background.`);
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
