"use client";

import { useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudentCourseUploadProps, UploadType } from './types';
import { useFileUpload, useDragAndDrop } from './hooks';
import { DropZone, UploadProgress } from './components';

export function StudentCourseUpload({ 
  courseId, 
  moduleId, 
  onUploadComplete, 
  className 
}: StudentCourseUploadProps) {
  const [activeTab, setActiveTab] = useState<UploadType>("files");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const packageInputRef = useRef<HTMLInputElement>(null);

  const { uploadFiles, handleFiles, removeFile, retryUpload } = useFileUpload(
    courseId,
    moduleId,
    onUploadComplete
  );

  const { isDragOver, handleDrop, handleDragOver, handleDragLeave } = useDragAndDrop(
    handleFiles,
    activeTab
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files, activeTab);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as UploadType)}>
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
          <DropZone
            type="individual"
            isDragOver={isDragOver}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            courseId={courseId}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
          />
        </TabsContent>

        <TabsContent value="package">
          <DropZone
            type="package"
            isDragOver={isDragOver}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => packageInputRef.current?.click()}
            courseId={courseId}
            fileInputRef={packageInputRef}
            onFileSelect={handleFileSelect}
          />
        </TabsContent>
      </Tabs>

      <UploadProgress
        uploadFiles={uploadFiles}
        onRemove={removeFile}
        onRetry={(fileId) => retryUpload(fileId, activeTab)}
      />
    </div>
  );
}