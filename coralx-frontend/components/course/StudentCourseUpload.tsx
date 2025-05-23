"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  FileText,
  FolderOpen,
  Package,
  CheckCircle2,
  AlertCircle,
  Brain,
  Loader2,
  BookOpen,
  Video,
  Mic,
  FileImage,
  Archive
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast as sonnerToast } from 'sonner';
import { studentAPI } from '@/lib/api';

interface UploadFile {
  id: string;
  file: File;
  status: "uploading" | "processing" | "completed" | "error";
  progress: number;
  processingStage?: string;
  error?: string;
}

interface StudentCourseUploadProps {
  courseId?: string; // Optional - if provided, upload to existing course
  onUploadComplete?: (result: any) => void;
  className?: string;
}

export function StudentCourseUpload({ courseId, onUploadComplete, className }: StudentCourseUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [activeTab, setActiveTab] = useState("files");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const packageInputRef = useRef<HTMLInputElement>(null);

  const fileTypes = {
    individual: {
      'application/pdf': ['.pdf'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac'],
      'video/*': ['.mp4', '.mov', '.avi', '.mkv'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'text/*': ['.txt', '.md'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    package: {
      'application/zip': ['.zip'],
      'application/x-tar': ['.tar'],
      'application/gzip': ['.gz', '.tar.gz'],
      'application/x-rar-compressed': ['.rar']
    }
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    const name = file.name.toLowerCase();
    
    if (type.includes('pdf')) return FileText;
    if (type.includes('audio')) return Mic;
    if (type.includes('video')) return Video;
    if (type.includes('image')) return FileImage;
    if (type.includes('zip') || name.includes('tar') || name.includes('rar')) return Archive;
    if (type.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx')) return BookOpen;
    return FileText;
  };

  const getFileColor = (file: File) => {
    const type = file.type;
    if (type.includes('pdf')) return "text-red-600";
    if (type.includes('audio')) return "text-purple-600";
    if (type.includes('video')) return "text-blue-600";
    if (type.includes('image')) return "text-green-600";
    if (type.includes('zip') || type.includes('tar') || type.includes('rar')) return "text-orange-600";
    return "text-gray-600";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File, uploadType: 'individual' | 'package'): string | null => {
    // Size validation (500MB for packages, 100MB for individual files)
    const maxSize = uploadType === 'package' ? 500 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return `File size must be less than ${uploadType === 'package' ? '500MB' : '100MB'}`;
    }

    // Type validation
    const acceptedTypes = fileTypes[uploadType];
    const isValidType = Object.keys(acceptedTypes).some(type => {
      if (type.includes('*')) {
        return file.type.startsWith(type.replace('*', ''));
      }
      return file.type === type;
    });

    if (!isValidType) {
      const typeList = uploadType === 'package' 
        ? "ZIP, TAR, or RAR archives"
        : "PDF, audio, video, image, or document files";
      return `File type not supported. Please upload ${typeList}.`;
    }

    return null;
  };

  const generateFileId = () => {
    return 'upload-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  };

  const uploadIndividualFiles = async (uploadFile: UploadFile) => {
    const fileId = uploadFile.id;
    
    try {
      if (!courseId) {
        throw new Error('Course ID is required for individual file uploads');
      }

      // Update status to uploading
      setUploadFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: "uploading", progress: 0 }
          : f
      ));

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('title', uploadFile.file.name);
      formData.append('description', `Student upload: ${uploadFile.file.name}`);
      
      // Upload to student's course
      const result = await studentAPI.uploadFile(courseId, formData);

      // Simulate progress during upload
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 25;
        if (progress <= 100) {
          setUploadFiles(prev => prev.map(f => 
            f.id === fileId 
              ? { ...f, progress, status: progress === 100 ? "processing" : "uploading" }
              : f
          ));
        }
      }, 300);

      setTimeout(() => {
        clearInterval(progressInterval);
        
        // Complete upload
        setUploadFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, status: "completed", processingStage: "Upload complete!", progress: 100 }
            : f
        ));

        // Call success callback
        onUploadComplete?.(result);
        sonnerToast.success(`${uploadFile.file.name} uploaded successfully!`);
      }, 2000);

    } catch (error) {
      console.error('Individual file upload error:', error);
      
      setUploadFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { 
              ...f, 
              status: "error",
              error: error instanceof Error ? error.message : "Upload failed"
            }
          : f
      ));

      sonnerToast.error(`Failed to upload ${uploadFile.file.name}`);
    }
  };

  const uploadCoursePackage = async (uploadFile: UploadFile) => {
    const fileId = uploadFile.id;
    
    try {
      // Update status to uploading
      setUploadFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: "uploading", progress: 0 }
          : f
      ));

      // Create FormData for package upload
      const formData = new FormData();
      formData.append('package', uploadFile.file);
      formData.append('extractContents', 'true');
      
      // Upload course package
      const result = await studentAPI.uploadCoursePackage(formData);

      // Simulate progress during upload and extraction
      const stages = [
        { progress: 20, stage: "Uploading package..." },
        { progress: 40, stage: "Extracting contents..." },
        { progress: 60, stage: "Processing course structure..." },
        { progress: 80, stage: "Creating course materials..." },
        { progress: 100, stage: "Course creation complete!" }
      ];

      for (let i = 0; i < stages.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setUploadFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { 
                ...f, 
                progress: stages[i].progress,
                status: stages[i].progress === 100 ? "completed" : "processing",
                processingStage: stages[i].stage
              }
            : f
        ));
      }

      // Call success callback
      onUploadComplete?.(result);
      sonnerToast.success(`Course package ${uploadFile.file.name} processed successfully!`);

    } catch (error) {
      console.error('Course package upload error:', error);
      
      setUploadFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { 
              ...f, 
              status: "error",
              error: error instanceof Error ? error.message : "Package upload failed"
            }
          : f
      ));

      sonnerToast.error(`Failed to process package ${uploadFile.file.name}`);
    }
  };

  const handleFiles = useCallback((files: FileList, uploadType: 'individual' | 'package') => {
    Array.from(files).forEach(file => {
      const error = validateFile(file, uploadType);
      if (error) {
        sonnerToast.error(error);
        return;
      }

      const uploadFile: UploadFile = {
        id: generateFileId(),
        file,
        status: "uploading",
        progress: 0,
      };

      setUploadFiles(prev => [...prev, uploadFile]);
      
      if (uploadType === 'individual') {
        uploadIndividualFiles(uploadFile);
      } else {
        uploadCoursePackage(uploadFile);
      }
    });
  }, [courseId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files) {
      handleFiles(files, activeTab as 'individual' | 'package');
    }
  }, [handleFiles, activeTab]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const retryUpload = (fileId: string) => {
    const uploadFile = uploadFiles.find(f => f.id === fileId);
    if (uploadFile) {
      setUploadFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: "uploading", progress: 0, error: undefined }
          : f
      ));
      
      if (activeTab === 'files') {
        uploadIndividualFiles(uploadFile);
      } else {
        uploadCoursePackage(uploadFile);
      }
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Individual Files
          </TabsTrigger>
          <TabsTrigger value="package" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Course Package
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files">
          <Card 
            className={cn(
              "canvas-card transition-all duration-200 cursor-pointer border-2 border-dashed",
              isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="p-8 text-center">
              <Upload className={cn("h-12 w-12 mx-auto mb-4", isDragOver ? "text-blue-600" : "text-gray-400")} />
              <h3 className="canvas-heading-3 mb-2">
                {isDragOver ? "Drop files here" : "Upload Individual Files"}
              </h3>
              <p className="canvas-body text-gray-500 mb-4">
                {courseId 
                  ? "Add files to your course"
                  : "Upload individual course files"
                }
              </p>
              <p className="canvas-small text-gray-400">
                Supports PDF, audio, video, images, and documents (up to 100MB each)
              </p>
              <Button className="mt-4" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
            </CardContent>
          </Card>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={Object.values(fileTypes.individual).flat().join(',')}
            onChange={(e) => e.target.files && handleFiles(e.target.files, 'individual')}
            className="hidden"
          />
        </TabsContent>

        <TabsContent value="package">
          <Card 
            className={cn(
              "canvas-card transition-all duration-200 cursor-pointer border-2 border-dashed",
              isDragOver ? "border-orange-400 bg-orange-50" : "border-gray-300 hover:border-gray-400"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => packageInputRef.current?.click()}
          >
            <CardContent className="p-8 text-center">
              <Package className={cn("h-12 w-12 mx-auto mb-4", isDragOver ? "text-orange-600" : "text-gray-400")} />
              <h3 className="canvas-heading-3 mb-2">
                {isDragOver ? "Drop package here" : "Upload Course Package"}
              </h3>
              <p className="canvas-body text-gray-500 mb-4">
                Upload a complete course as a ZIP or archive file
              </p>
              <p className="canvas-small text-gray-400">
                Supports ZIP, TAR, and RAR archives (up to 500MB)
              </p>
              <Button className="mt-4" size="sm" variant="secondary">
                <Archive className="h-4 w-4 mr-2" />
                Choose Package
              </Button>
            </CardContent>
          </Card>
          
          <input
            ref={packageInputRef}
            type="file"
            accept={Object.values(fileTypes.package).flat().join(',')}
            onChange={(e) => e.target.files && handleFiles(e.target.files, 'package')}
            className="hidden"
          />
        </TabsContent>
      </Tabs>

      {/* Upload Progress */}
      {uploadFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="canvas-heading-3">Upload Progress</h3>
          {uploadFiles.map((uploadFile) => {
            const IconComponent = getFileIcon(uploadFile.file);
            return (
              <Card key={uploadFile.id} className="canvas-card">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <IconComponent className={cn("h-8 w-8 flex-shrink-0", getFileColor(uploadFile.file))} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium sidebar-text truncate">{uploadFile.file.name}</h4>
                        <div className="flex items-center gap-2">
                          {uploadFile.status === "completed" && (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          )}
                          {uploadFile.status === "error" && (
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          )}
                          {(uploadFile.status === "processing" || uploadFile.status === "uploading") && (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => removeFile(uploadFile.id)}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-xs sidebar-text-muted mb-2">
                        {formatFileSize(uploadFile.file.size)}
                      </p>

                      {(uploadFile.status === "uploading" || uploadFile.status === "processing") && (
                        <div className="space-y-2">
                          <Progress value={uploadFile.progress} className="h-2" />
                          <p className="text-xs text-blue-600">
                            {uploadFile.processingStage || `Uploading... ${uploadFile.progress}%`}
                          </p>
                        </div>
                      )}

                      {uploadFile.status === "completed" && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Upload Complete
                          </Badge>
                        </div>
                      )}

                      {uploadFile.status === "error" && (
                        <div className="space-y-2">
                          <p className="text-xs text-red-600">{uploadFile.error || "Upload failed"}</p>
                          <Button size="sm" variant="outline" onClick={() => retryUpload(uploadFile.id)}>
                            Retry
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
} 