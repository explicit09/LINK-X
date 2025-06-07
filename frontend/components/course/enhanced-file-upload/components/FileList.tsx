import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  X, CheckCircle2, AlertCircle, Brain, Loader2, 
  FileCheck, Clock, Upload, RefreshCw, Eye 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UploadFile } from '../types';
import { getFileIcon, getFileColor, formatFileSize } from '../utils';

interface FileListProps {
  uploadFiles: UploadFile[];
  onRemove: (fileId: string) => void;
  onRetry: (fileId: string) => void;
}

export function FileList({ uploadFiles, onRemove, onRetry }: FileListProps) {
  if (uploadFiles.length === 0) {
    return null;
  }

  const getStatusInfo = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
        return {
          icon: Upload,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          label: 'Uploading'
        };
      case 'processing':
        return {
          icon: Brain,
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          label: 'Processing'
        };
      case 'completed':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          label: 'Complete'
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          label: 'Error'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          label: 'Pending'
        };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileCheck className="w-5 h-5" />
          Upload Progress ({uploadFiles.length} files)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploadFiles.map((uploadFile) => {
          const IconComponent = getFileIcon(uploadFile.file);
          const statusInfo = getStatusInfo(uploadFile.status);
          const StatusIcon = statusInfo.icon;
          
          return (
            <div 
              key={uploadFile.id} 
              className={cn(
                'border rounded-lg p-4 transition-all duration-200',
                statusInfo.border,
                statusInfo.bg
              )}
            >
              <div className="flex items-start gap-4">
                {/* File Icon */}
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-200 flex-shrink-0">
                  <IconComponent
                    className={cn(
                      'h-6 w-6',
                      getFileColor(uploadFile.file),
                    )}
                  />
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-gray-900 truncate text-sm">
                        {uploadFile.file.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(uploadFile.file.size)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-3">
                      {/* Status Badge */}
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          'text-xs border flex items-center gap-1',
                          statusInfo.color,
                          statusInfo.border
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusInfo.label}
                      </Badge>
                      
                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                        onClick={() => onRemove(uploadFile.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Indicators */}
                  {uploadFile.status === 'uploading' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-blue-600 font-medium">Uploading to server...</span>
                        <span className="text-blue-600">{uploadFile.progress}%</span>
                      </div>
                      <Progress value={uploadFile.progress} className="h-2" />
                    </div>
                  )}

                  {uploadFile.status === 'processing' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                        <span className="text-xs text-purple-600 font-medium">
                          {uploadFile.processingStage || 'Processing for AI learning...'}
                        </span>
                      </div>
                      <div className="w-full bg-purple-100 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full animate-pulse transition-all duration-1000"
                          style={{ width: '75%' }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {uploadFile.status === 'completed' && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">
                          Ready for learning! File has been processed and indexed.
                        </span>
                      </div>
                      <Button variant="outline" size="sm" className="h-7">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  )}

                  {uploadFile.status === 'error' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-xs text-red-600 font-medium">
                          {uploadFile.error || 'Upload failed. Please try again.'}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRetry(uploadFile.id)}
                        className="h-8 text-xs border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry Upload
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
