import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MoreVertical,
  Trash2,
  Download,
  MessageSquare,
  Eye,
  FileText,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Material } from '../hooks/useModuleManager';
import {
  formatFileSize,
  formatUploadTime,
  getFileIcon,
  getFileColor,
  getFileTypeName,
  getThumbnailUrl,
  supportsPreview,
  supportsAI,
} from '../utils/fileUtils';

interface MaterialCardProps {
  material: Material;
  canModify?: boolean;
  onView?: (material: Material) => void;
  onAskAI?: (material: Material) => void;
  onDownload?: (material: Material) => void;
  onDelete?: (materialId: string) => void;
  className?: string;
}

export function MaterialCard({
  material,
  canModify = false,
  onView,
  onAskAI,
  onDownload,
  onDelete,
  className = '',
}: MaterialCardProps) {
  const thumbnailUrl = getThumbnailUrl(material);
  const fileIcon = getFileIcon(material.fileType);
  const fileColor = getFileColor(material.fileType);
  const fileTypeName = getFileTypeName(material.fileType);
  const canPreview = supportsPreview(material.fileType);
  const canAI = supportsAI(material.fileType);

  const handleCardClick = () => {
    if (canPreview && onView) {
      onView(material);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload(material);
    } else if (material.downloadUrl) {
      window.open(material.downloadUrl, '_blank');
    }
  };

  const handleAskAI = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAskAI) {
      onAskAI(material);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(material.id);
    }
  };

  return (
    <Card
      className={`group hover:shadow-md transition-all duration-200 ${canPreview ? 'cursor-pointer' : ''} ${className}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Thumbnail or Icon */}
          <div className="flex-shrink-0">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={material.title}
                className="w-16 h-20 object-cover rounded-lg border"
              />
            ) : (
              <div className="w-16 h-20 bg-gray-100 rounded-lg border flex items-center justify-center">
                <span className="text-2xl">{fileIcon}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                  {material.title}
                </h4>
                <div className="mt-1 flex items-center space-x-2">
                  <Badge variant="secondary" className={`text-xs ${fileColor}`}>
                    {fileTypeName}
                  </Badge>
                  {material.fileSize && (
                    <span className="text-xs text-gray-500">
                      {formatFileSize(material.fileSize)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Uploaded {formatUploadTime(material.uploadDate)}
                </p>

                {/* AI Summary */}
                {material.aiSummary && (
                  <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                    {material.aiSummary}
                  </p>
                )}

                {/* Chunk Count */}
                {material.chunkCount && (
                  <div className="mt-2 flex items-center text-xs text-gray-500">
                    <FileText className="w-3 h-3 mr-1" />
                    {material.chunkCount} chunks processed
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {canPreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView?.(material);
                    }}
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}

                {canAI && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                    onClick={handleAskAI}
                    title="Ask AI about this file"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleDownload}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>

                {canModify && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      {canAI && (
                        <DropdownMenuItem onClick={handleAskAI}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Ask AI
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
