'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  Video, 
  Image, 
  Download, 
  ExternalLink, 
  CheckCircle, 
  Circle,
  Clock,
  Calendar,
  Trophy,
  Lock,
  FileAudio,
  Link,
  FileSpreadsheet,
  Presentation,
  Archive,
  File
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Material {
  id: string;
  title: string;
  description?: string;
  file_type: string;
  file_path?: string;
  completed?: boolean;
  due_date?: string;
  points?: number;
  locked?: boolean;
  available_from?: string;
  estimated_time?: number; // in minutes
}

interface CanvasModuleItemProps {
  material: Material;
  moduleId: string;
  onClick?: (moduleId: string, fileId: string) => void;
  className?: string;
}

export function CanvasModuleItem({ 
  material, 
  moduleId, 
  onClick, 
  className 
}: CanvasModuleItemProps) {
  
  // Get appropriate icon for file type
  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    
    if (type.includes('pdf') || type.includes('document')) {
      return <FileText className="h-4 w-4" />;
    } else if (type.includes('video') || type.includes('mp4') || type.includes('mov')) {
      return <Video className="h-4 w-4" />;
    } else if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) {
      return <Image className="h-4 w-4" />;
    } else if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) {
      return <FileAudio className="h-4 w-4" />;
    } else if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
      return <FileSpreadsheet className="h-4 w-4" />;
    } else if (type.includes('presentation') || type.includes('powerpoint') || type.includes('ppt')) {
      return <Presentation className="h-4 w-4" />;
    } else if (type.includes('zip') || type.includes('rar') || type.includes('archive')) {
      return <Archive className="h-4 w-4" />;
    } else if (type.includes('link') || type.includes('url')) {
      return <Link className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  // Get file type color
  const getFileTypeColor = (fileType: string) => {
    const type = fileType.toLowerCase();
    
    if (type.includes('pdf') || type.includes('document')) {
      return 'text-red-600';
    } else if (type.includes('video')) {
      return 'text-blue-600';
    } else if (type.includes('image')) {
      return 'text-green-600';
    } else if (type.includes('audio')) {
      return 'text-purple-600';
    } else if (type.includes('spreadsheet') || type.includes('excel')) {
      return 'text-green-700';
    } else if (type.includes('presentation')) {
      return 'text-orange-600';
    } else if (type.includes('link')) {
      return 'text-blue-500';
    } else {
      return 'text-gray-600';
    }
  };

  // Check if item is available
  const isAvailable = () => {
    if (material.locked) return false;
    if (material.available_from) {
      const availableDate = new Date(material.available_from);
      return new Date() >= availableDate;
    }
    return true;
  };

  // Check if item is overdue
  const isOverdue = () => {
    if (!material.due_date) return false;
    const dueDate = new Date(material.due_date);
    return new Date() > dueDate && !material.completed;
  };

  const available = isAvailable();
  const overdue = isOverdue();

  const handleClick = () => {
    if (available && onClick) {
      onClick(moduleId, material.id);
    }
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors",
        available ? "cursor-pointer" : "cursor-not-allowed opacity-60",
        className
      )}
      onClick={handleClick}
    >
      {/* Completion Status */}
      <div className="flex-shrink-0">
        {!available ? (
          <Lock className="h-4 w-4 text-gray-400" />
        ) : material.completed ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <Circle className="h-4 w-4 text-gray-400" />
        )}
      </div>

      {/* File Type Icon */}
      <div className={cn("flex-shrink-0", getFileTypeColor(material.file_type))}>
        {getFileIcon(material.file_type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={cn(
            "font-medium truncate",
            available ? "text-gray-900 hover:text-blue-600" : "text-gray-500"
          )}>
            {material.title}
          </h4>
          
          {/* Status Badges */}
          <div className="flex items-center gap-1">
            {material.points && (
              <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                <Trophy className="h-3 w-3" />
                {material.points} pts
              </span>
            )}
            
            {overdue && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                Overdue
              </span>
            )}
            
            {!available && material.available_from && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                Available {formatDistanceToNow(new Date(material.available_from), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {material.description && (
          <p className="text-sm text-gray-600 truncate mt-1">
            {material.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
          {material.estimated_time && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{material.estimated_time} min</span>
            </div>
          )}
          
          {material.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span className={overdue ? "text-red-600 font-medium" : ""}>
                Due {formatDistanceToNow(new Date(material.due_date), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {material.file_path && available && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Handle download
              window.open(material.file_path, '_blank');
            }}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
        
        {available && (
          <ExternalLink className="h-4 w-4 text-gray-400" />
        )}
      </div>
    </div>
  );
}