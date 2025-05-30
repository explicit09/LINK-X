export interface UploadFile {
  id: string;
  file: File;
  status: "uploading" | "processing" | "completed" | "error";
  progress: number;
  processingStage?: string;
  error?: string;
}

export interface EnhancedFileUploadProps {
  courseId: string;
  moduleId?: string;
  userRole?: 'student' | 'instructor' | 'admin';
  onUploadComplete?: (file: {
    id: string;
    title: string;
    filename: string;
    file_type: string;
    module_id?: string;
  }) => void;
  className?: string;
}