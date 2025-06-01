'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Video,
  Music,
  Image,
  File,
  Play,
  Download,
  MessageSquare,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  createInlineProgress,
  createFileCard,
  getFileTypeStyle,
} from '@/lib/design-system';
import { FileCard } from './FileCard';
import { toast as sonnerToast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// P0: Loading skeleton for enterprise UX
const FileCardSkeleton = () => (
  <div className="p-4 border-b border-gray-100 last:border-b-0 animate-pulse">
    <div className="flex items-center gap-4">
      <div className="flex-shrink-0 ml-4">
        <div className="h-5 w-5 bg-gray-200 rounded"></div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-4 bg-gray-200 rounded w-48"></div>
          <div className="h-5 bg-gray-200 rounded-full w-16"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 bg-gray-200 rounded w-12"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
      <div className="flex-shrink-0">
        <div className="flex items-center gap-1">
          <div className="h-8 w-8 bg-gray-200 rounded"></div>
          <div className="h-8 w-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  </div>
);

interface Material {
  id: string;
  title: string;
  type: 'pdf' | 'audio' | 'video' | 'document';
  size?: string;
  uploadedAt: string;
  processed?: boolean;
  moduleId?: string;
  moduleName?: string;
}

interface ModuleCardProps {
  module: {
    id: string;
    title: string;
    materials: Material[];
    isExpanded?: boolean;
    weekNumber?: number;
    description?: string;
  };
  onToggle: (moduleId: string) => void;
  onViewMaterial: (material: Material) => void;
  onUploadFile: (moduleId: string) => void;
  onAskAI: (material: Material) => void;
  onDeleteFile?: (fileId: string, moduleId: string) => void;
  onDeleteModule?: (moduleId: string) => void;
  className?: string;
}

// P0: Data validation - no more "NaN" or "Size unknown"
const validateMaterial = (material: Material) => {
  return {
    ...material,
    title: material.title || 'Untitled File',
    size: material.size || undefined,
    uploadedAt: material.uploadedAt || new Date().toISOString(),
    processed: material.processed !== false,
  };
};

export function ModuleCard({
  module,
  onToggle,
  onViewMaterial,
  onUploadFile,
  onAskAI,
  onDeleteFile,
  onDeleteModule,
  className,
}: ModuleCardProps) {
  // P0: Validate all data before render
  const validMaterials = module.materials.map(validateMaterial);
  const completedMaterials = validMaterials.filter((m) => m.processed).length;
  const progressPercentage =
    validMaterials.length > 0
      ? (completedMaterials / validMaterials.length) * 100
      : 0;
  const progressData = createInlineProgress(progressPercentage);

  // Create progress pill text
  const progressPill =
    validMaterials.length === 0
      ? 'No files'
      : completedMaterials === validMaterials.length
        ? 'Complete'
        : `${completedMaterials}/${validMaterials.length}`;

  // P1: Single neutral card style - no more rainbow colors
  const cardClassName = cn(
    'bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-200',
    'hover:shadow-md hover:border-gray-300',
    className,
  );

  const handleMaterialAction = (action: string, material: Material) => {
    switch (action) {
      case 'view':
        onViewMaterial(material);
        break;
      case 'download':
        sonnerToast.info(`Downloading ${material.title}...`);
        break;
      case 'ask-ai':
        onAskAI(material);
        break;
    }
  };

  return (
    <Card className={cardClassName}>
      {/* P1: Enterprise-grade module header with proper layout */}
      <CardHeader
        className="cursor-pointer pb-4 hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100"
        onClick={() => onToggle(module.id)}
      >
        <div className="flex items-center justify-between">
          {/* Left section: Chevron + Title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Expand/Collapse Chevron - leftmost */}
            <div className="flex-shrink-0">
              {module.isExpanded ? (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-600" />
              )}
            </div>

            {/* Module Title and Description */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                {module.title}
              </h3>

              {module.description && (
                <p className="text-sm text-gray-600 line-clamp-1">
                  {module.description}
                </p>
              )}
            </div>
          </div>

          {/* Right section: File count + Add Files + Actions + Status */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* File count */}
            <span className="text-sm text-gray-500 font-medium">
              {validMaterials.length}{' '}
              {validMaterials.length === 1 ? 'file' : 'files'}
            </span>

            {/* Add Files button - right-aligned */}
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onUploadFile(module.id);
              }}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
            >
              <Upload className="h-4 w-4 mr-2" />
              Add Files
            </Button>

            {/* Module Actions Dropdown */}
            {onDeleteModule && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteModule(module.id);
                    }}
                    className="flex items-center gap-2 text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Module
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Status pill - far right */}
            {completedMaterials > 0 && (
              <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs font-medium">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                AI Ready
              </Badge>
            )}
          </div>
        </div>

        {/* Progress bar below header if files exist */}
        {validMaterials.length > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1">
              <Progress
                value={progressPercentage}
                className="h-2 bg-gray-200"
              />
            </div>
            <Badge className="bg-gray-100 text-gray-700 border border-gray-200 text-xs font-medium">
              {progressPill}
            </Badge>
          </div>
        )}
      </CardHeader>

      {/* P1: Collapsible content - default closed */}
      {module.isExpanded && (
        <CardContent className="pt-0">
          {validMaterials.length === 0 ? (
            /* Empty State with Proper Guidance */
            <div
              className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:border-indigo-400 hover:bg-indigo-25 transition-all duration-200 cursor-pointer group"
              onClick={() => onUploadFile(module.id)}
            >
              <div className="relative mb-6">
                <Upload className="h-16 w-16 text-gray-400 group-hover:text-indigo-500 transition-colors duration-200" />
                <div className="absolute -top-1 -right-1 h-6 w-6 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-200 transition-colors duration-200">
                  <span className="text-xs font-bold text-indigo-600">+</span>
                </div>
              </div>

              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                No files yet
              </h4>
              <p className="text-sm text-gray-600 text-center max-w-md mb-4 leading-relaxed">
                Drop PDF, audio, video, or presentation files here to get
                started with AI-powered learning experiences
              </p>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="px-2 py-1 bg-gray-200 rounded-full font-medium">
                  PDF
                </span>
                <span className="px-2 py-1 bg-gray-200 rounded-full font-medium">
                  Audio
                </span>
                <span className="px-2 py-1 bg-gray-200 rounded-full font-medium">
                  Video
                </span>
                <span className="px-2 py-1 bg-gray-200 rounded-full font-medium">
                  Docs
                </span>
              </div>
            </div>
          ) : (
            /* P1: Enterprise file list with zebra striping */
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {validMaterials.map((material, index) => (
                <FileCard
                  key={material.id}
                  file={{
                    id: material.id,
                    name: material.title,
                    type: material.type,
                    size: material.size ? parseInt(material.size) : undefined,
                    processed: material.processed,
                    uploadedAt: material.uploadedAt,
                  }}
                  onPreview={() => onViewMaterial(material)}
                  onDownload={() => handleMaterialAction('download', material)}
                  onDelete={
                    onDeleteFile
                      ? () => onDeleteFile(material.id, module.id)
                      : undefined
                  }
                  isEven={index % 2 === 0}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
