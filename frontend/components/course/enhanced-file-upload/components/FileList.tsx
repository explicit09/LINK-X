import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { X, CheckCircle2, AlertCircle, Brain, Loader2 } from 'lucide-react';
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

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Uploaded Files</h4>
      {uploadFiles.map((uploadFile) => {
        const IconComponent = getFileIcon(uploadFile.file);
        return (
          <Card key={uploadFile.id} className="canvas-card">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <IconComponent
                  className={cn(
                    'h-8 w-8 flex-shrink-0',
                    getFileColor(uploadFile.file),
                  )}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium sidebar-text truncate">
                      {uploadFile.file.name}
                    </h4>
                    <div className="flex items-center gap-2">
                      {uploadFile.status === 'completed' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {uploadFile.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      {uploadFile.status === 'processing' && (
                        <div className="flex items-center gap-1">
                          <Brain className="h-4 w-4 text-blue-600" />
                          <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onRemove(uploadFile.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <span>{formatFileSize(uploadFile.file.size)}</span>
                  </div>

                  {uploadFile.status === 'uploading' && (
                    <div className="space-y-1">
                      <Progress value={uploadFile.progress} className="h-2" />
                      <p className="text-xs text-blue-600">
                        Uploading... {uploadFile.progress}%
                      </p>
                    </div>
                  )}

                  {uploadFile.status === 'processing' && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-blue-100 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full animate-pulse"
                            style={{ width: '60%' }}
                          ></div>
                        </div>
                      </div>
                      <p className="text-xs text-blue-600">
                        {uploadFile.processingStage}
                      </p>
                    </div>
                  )}

                  {uploadFile.status === 'completed' && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Processed
                      </Badge>
                    </div>
                  )}

                  {uploadFile.status === 'error' && (
                    <div className="space-y-2">
                      <p className="text-xs text-red-600">
                        {uploadFile.error || 'Upload failed'}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRetry(uploadFile.id)}
                      >
                        Retry Upload
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
  );
}
