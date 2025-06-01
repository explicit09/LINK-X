export interface UploadFile {
  id: string;
  file: File;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  processingStage?: string;
  error?: string;
}

export interface StudentCourseUploadProps {
  courseId?: string; // Optional - if provided, upload to existing course
  moduleId?: string; // Optional - specify module/week for upload
  onUploadComplete?: (result: any) => void;
  className?: string;
}

export interface FileTypes {
  individual: Record<string, string[]>;
  package: Record<string, string[]>;
}

export type UploadType = 'individual' | 'package';

export interface UploadStage {
  progress: number;
  stage: string;
}
