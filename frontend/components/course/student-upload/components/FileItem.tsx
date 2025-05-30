import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadFile } from '../types';
import { getFileIcon, getFileColor, formatFileSize } from '../utils/fileUtils';

interface FileItemProps {
  uploadFile: UploadFile;
  onRemove: (fileId: string) => void;
  onRetry: (fileId: string) => void;
}

export const FileItem: React.FC<FileItemProps> = ({ uploadFile, onRemove, onRetry }) => {
  const IconComponent = getFileIcon(uploadFile.file);
  
  return (
    <Card className="canvas-card">
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
                  onClick={() => onRemove(uploadFile.id)}
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
                <Button size="sm" variant="outline" onClick={() => onRetry(uploadFile.id)}>
                  Retry
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};