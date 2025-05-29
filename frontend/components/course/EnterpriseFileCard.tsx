"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Video, 
  Music, 
  Image,
  File,
  Play,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles
} from "lucide-react";

interface FileCardProps {
  file: {
    id: string;
    title: string;
    filename?: string;
    type: "pdf" | "audio" | "video" | "document";
    size?: string | number;
    uploadedAt: string;
    processed?: boolean;
    error?: boolean;
  };
  onPreview?: (fileId: string) => void;
  onDownload?: (fileId: string) => void;
  onDelete?: (fileId: string) => void;
  onPersonalize?: (fileId: string) => void;
  className?: string;
  isSelected?: boolean;
  onSelect?: (fileId: string, selected: boolean) => void;
  showActions?: boolean;
}

const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf': return FileText;
    case 'video': return Video;
    case 'audio': return Music;
    case 'image': return Image;
    default: return File;
  }
};

const getFileColor = (type: string) => {
  switch (type) {
    case 'pdf': return 'text-red-600';
    case 'video': return 'text-blue-600';
    case 'audio': return 'text-purple-600';
    case 'image': return 'text-green-700';
    default: return 'text-gray-600';
  }
};

const formatFileSize = (bytes: number | string) => {
  if (!bytes || bytes === 0) return "—";
  
  const numBytes = typeof bytes === 'string' ? parseInt(bytes) : bytes;
  if (isNaN(numBytes) || numBytes === 0) return "—";
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(numBytes) / Math.log(k));
  const size = parseFloat((numBytes / Math.pow(k, i)).toFixed(1));
  return `${size} ${sizes[i]}`;
};

const formatRelativeTime = (dateString: string) => {
  if (!dateString) return "—";
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export function EnterpriseFileCard({
  file,
  onPreview,
  onDownload,
  onDelete,
  onPersonalize,
  className,
  isSelected = false,
  onSelect,
  showActions = true
}: FileCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const IconComponent = getFileIcon(file.type);
  const iconColor = getFileColor(file.type);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelect?.(file.id, e.target.checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPreview?.(file.id);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0",
        "hover:bg-gray-50 transition-colors duration-150",
        "focus-within:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-inset",
        isSelected && "bg-blue-50 border-blue-200",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Selection Checkbox */}
      {onSelect && (
        <div className="flex-shrink-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelect}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            aria-label={`Select ${file.title}`}
          />
        </div>
      )}

      {/* File Icon - 16px indent for hierarchy */}
      <div className={cn("flex-shrink-0 ml-4", iconColor)}>
        <IconComponent className="h-5 w-5" />
      </div>

      {/* File Content */}
      <div 
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onPreview?.(file.id)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Preview ${file.title}`}
      >
        <div className="flex items-center gap-3 mb-1">
          <h3 
            className="text-sm font-medium text-gray-900 truncate leading-tight"
            title={file.title}
          >
            {file.title}
          </h3>
          
          {/* Status Badge */}
          <Badge 
            className={cn(
              "text-xs font-medium border shrink-0",
              file.processed 
                ? "bg-green-50 text-green-700 border-green-200" 
                : file.error 
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-yellow-50 text-yellow-700 border-yellow-200"
            )}
          >
            {file.processed ? (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : file.error ? (
              <AlertCircle className="h-3 w-3 mr-1" />
            ) : (
              <Clock className="h-3 w-3 mr-1" />
            )}
            {file.processed ? "Ready" : file.error ? "Error" : "Processing"}
          </Badge>
        </div>
        
        {/* File Metadata */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{formatFileSize(file.size || 0)}</span>
          <span>•</span>
          <span>{formatRelativeTime(file.uploadedAt)}</span>
          {file.filename && file.filename !== file.title && (
            <>
              <span>•</span>
              <span className="truncate max-w-32" title={file.filename}>
                {file.filename}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons - Show on hover or when selected */}
      {showActions && (isHovered || isSelected) && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {onPreview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(file.id);
              }}
              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              aria-label={`Preview ${file.title}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          
          {onDownload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(file.id);
              }}
              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              aria-label={`Download ${file.title}`}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          
          {onPersonalize && file.processed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onPersonalize(file.id);
              }}
              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              aria-label={`Personalize ${file.title}`}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          )}
          
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(file.id);
              }}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              aria-label={`Delete ${file.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
} 