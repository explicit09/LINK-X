'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Video,
  Music,
  Image,
  File,
  MoreHorizontal,
  Download,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createFileCard, getFileTypeStyle } from '@/lib/design-system';
import { toast as sonnerToast } from 'sonner';

interface FileCardProps {
  file: {
    id: string;
    name: string;
    type: string;
    size?: number;
    processed?: boolean;
    uploadedAt?: string;
    error?: string;
  };
  onPreview?: (fileId: string) => void;
  onDownload?: (fileId: string) => void;
  onDelete?: (fileId: string) => void;
  className?: string;
  isEven?: boolean; // For zebra striping
}

// P0: Data validation - no more "NaN" or "Size unknown"
const getFileIcon = (type: string) => {
  const iconMap: Record<string, any> = {
    pdf: FileText,
    document: FileText,
    video: Video,
    audio: Music,
    image: Image,
    default: File,
  };

  return iconMap[type] || iconMap.default;
};

export function FileCard({
  file,
  onPreview,
  onDownload,
  onDelete,
  className,
  isEven = false,
}: FileCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // P0: Validate data before render
  const fileData = createFileCard(file);
  const typeStyle = getFileTypeStyle(file.type);
  const IconComponent = getFileIcon(file.type);

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return null;
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format upload date
  const formatUploadDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return null;
    }
  };

  // P1: Enterprise-grade styling with zebra striping and proper hierarchy
  const cardClassName = cn(
    'group relative transition-all duration-150 border-0 rounded-none',
    'hover:bg-gray-50 focus-within:bg-gray-50',
    // Zebra striping for better scanning
    isEven ? 'bg-gray-25' : 'bg-white',
    // 1px divider line between rows
    'border-b border-gray-100 last:border-b-0',
    file.error && 'bg-red-25 hover:bg-red-50',
    className,
  );

  // P5: Hover actions - slide-in buttons
  const actions = [
    ...(onPreview
      ? [
          {
            label: 'Preview',
            icon: Eye,
            onClick: () => onPreview(file.id),
            variant: 'default' as const,
          },
        ]
      : []),
    ...(onDownload
      ? [
          {
            label: 'Download',
            icon: Download,
            onClick: () => onDownload(file.id),
            variant: 'default' as const,
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            label: 'Delete',
            icon: Trash2,
            onClick: () => onDelete(file.id),
            variant: 'destructive' as const,
          },
        ]
      : []),
  ];

  return (
    <Card
      className={cardClassName}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* File Type Icon - 16px indent for hierarchy */}
          <div className={cn('flex-shrink-0 ml-4', typeStyle.color)}>
            <IconComponent className="h-5 w-5" />
          </div>

          {/* File Info - Improved hierarchy */}
          <div className="flex-1 min-w-0">
            {/* P1: Single-line name with proper typography hierarchy */}
            <div className="flex items-center gap-3 mb-1">
              <h3
                className="text-sm font-medium text-gray-900 truncate leading-tight"
                title={file.name} // P1: Hover reveals full filename
              >
                {file.name}
              </h3>

              {/* P1: Colored status pill with proper contrast */}
              <Badge
                className={cn(
                  'text-xs font-medium border',
                  file.processed
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : file.error
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-yellow-50 text-yellow-700 border-yellow-200',
                )}
              >
                {file.processed ? (
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                ) : file.error ? (
                  <AlertCircle className="h-3 w-3 mr-1" />
                ) : (
                  <Clock className="h-3 w-3 mr-1" />
                )}
                {file.error
                  ? 'Error'
                  : file.processed
                    ? 'Processed'
                    : 'Processing'}
              </Badge>
            </div>

            {/* File metadata with proper contrast */}
            <div className="flex items-center gap-2 text-xs text-gray-600">
              {formatFileSize(file.size) && (
                <span className="font-medium">{formatFileSize(file.size)}</span>
              )}
              {formatUploadDate(file.uploadedAt) && (
                <>
                  {formatFileSize(file.size) && (
                    <span className="text-gray-400">•</span>
                  )}
                  <span>{formatUploadDate(file.uploadedAt)}</span>
                </>
              )}
            </div>

            {/* Error message with proper styling */}
            {file.error && (
              <p
                className="text-xs text-red-600 mt-1 truncate font-medium"
                title={file.error}
              >
                {file.error}
              </p>
            )}
          </div>

          {/* P1: Inline actions on hover - no overflow menu clutter */}
          <div className="flex-shrink-0">
            {actions.length > 0 && (
              <div
                className={cn(
                  'flex items-center gap-1 transition-opacity duration-150',
                  isHovered ? 'opacity-100' : 'opacity-0',
                )}
              >
                {actions.map((action, index) => {
                  const ActionIcon = action.icon;
                  return (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-8 w-8 p-0 transition-all duration-150',
                        action.variant === 'destructive'
                          ? onDelete
                            ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                            : 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick();
                      }}
                      disabled={action.variant === 'destructive' && !onDelete}
                      title={action.label}
                    >
                      <ActionIcon className="h-4 w-4" />
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
