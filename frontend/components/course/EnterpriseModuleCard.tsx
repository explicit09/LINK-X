"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSmartToast } from '@/hooks/use-smart-toast';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EnterpriseFileCard } from "./EnterpriseFileCard";
import { 
  ChevronDown, 
  ChevronRight, 
  Upload,
  MoreHorizontal,
  Trash2,
  Edit,
  FolderOpen,
  FileText,
  Sparkles
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Material {
  id: string;
  title: string;
  filename?: string;
  type: "pdf" | "audio" | "video" | "document";
  size?: string | number;
  uploadedAt: string;
  processed?: boolean;
  error?: boolean;
  moduleId?: string;
  moduleName?: string;
}

interface ModuleCardProps {
  module: {
    id: string;
    title: string;
    description?: string;
    materials: Material[];
    isExpanded?: boolean;
    weekNumber?: number;
  };
  onToggle: (moduleId: string) => void;
  onViewMaterial: (material: Material) => void;
  onUploadFile: (moduleId: string) => void;
  onAskAI: (material: Material) => void;
  onDeleteFile?: (fileId: string, moduleId: string) => void;
  onDeleteModule?: (moduleId: string) => void;
  onEditModule?: (module: any) => void;
  className?: string;
  selectedFiles?: Set<string>;
  onSelectFile?: (fileId: string, selected: boolean) => void;
  onBulkAction?: (action: string, fileIds: string[]) => void;
}

export function EnterpriseModuleCard({
  module,
  onToggle,
  onViewMaterial,
  onUploadFile,
  onAskAI,
  onDeleteFile,
  onDeleteModule,
  onEditModule,
  className,
  selectedFiles = new Set(),
  onSelectFile,
  onBulkAction
}: ModuleCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPersonalizing, setIsPersonalizing] = useState(false);
  const router = useRouter();
  const toast = useSmartToast();

  // Calculate progress
  const { completedMaterials, progressPercentage } = useMemo(() => {
    const completed = module.materials.filter(m => m.processed).length;
    const total = module.materials.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    return { completedMaterials: completed, progressPercentage: percentage };
  }, [module.materials]);

  // Get selected files in this module
  const selectedFilesInModule = useMemo(() => {
    return module.materials.filter(m => selectedFiles.has(m.id));
  }, [module.materials, selectedFiles]);

  const handleSelectAll = (selected: boolean) => {
    module.materials.forEach(material => {
      onSelectFile?.(material.id, selected);
    });
  };

  const handlePersonalizeAll = async () => {
    if (module.materials.length === 0) {
      toast.error("No files to personalize in this module");
      return;
    }

    // New streaming approach - go directly to streaming page with the first file
    // The streaming page will handle fetching user profile and generating content in real-time
    if (module.materials.length > 0) {
      const firstFileId = module.materials[0].id;
      
      setIsPersonalizing(true);
      const loadingToast = toast.loading(`Opening personalized study guide...`, {
        description: "Redirecting to your learning experience"
      });
      
      // Small delay for better UX
      setTimeout(() => {
        toast.dismiss(loadingToast);
        setIsPersonalizing(false);
        router.push(`/learn/streaming/${firstFileId}?moduleId=${module.id}`);
      }, 500);
    }
  };

  const allSelected = module.materials.length > 0 && 
    module.materials.every(m => selectedFiles.has(m.id));
  const someSelected = module.materials.some(m => selectedFiles.has(m.id));

  return (
    <div 
      className={cn(
        "bg-white border border-gray-200 rounded-lg overflow-hidden",
        "hover:border-gray-300 transition-colors duration-150",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Module Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          {/* Left section: Chevron + Title + Progress */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Expand/Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggle(module.id)}
              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              aria-label={module.isExpanded ? "Collapse module" : "Expand module"}
            >
              {module.isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            {/* Module Title and Progress */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {module.title}
                </h3>
                {module.weekNumber && (
                  <Badge variant="outline" className="text-xs font-medium">
                    Week {module.weekNumber}
                  </Badge>
                )}
              </div>
              
              {/* Module Description */}
              {module.description && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {module.description}
                </p>
              )}
              
              {/* Progress Bar and Stats */}
              {module.materials.length > 0 && (
                <div className="flex items-center gap-4">
                  <div className="flex-1 max-w-48">
                    <Progress 
                      value={progressPercentage} 
                      className="h-2"
                      aria-label={`${completedMaterials} of ${module.materials.length} files processed`}
                    />
                  </div>
                  <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
                    {completedMaterials}/{module.materials.length} ready
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right section: File count + Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* File count */}
            <span className="text-sm text-gray-500 font-medium">
              {module.materials.length} {module.materials.length === 1 ? 'file' : 'files'}
            </span>
            
            {/* Bulk Actions (show when files are selected) */}
            {selectedFilesInModule.length > 0 && onBulkAction && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-600 font-medium">
                  {selectedFilesInModule.length} selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onBulkAction('delete', selectedFilesInModule.map(f => f.id))}
                  className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            )}
            
            {/* Personalize button (show when module has files) */}
            {module.materials.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePersonalizeAll}
                disabled={isPersonalizing}
                className="border-blue-300 text-blue-700 hover:bg-blue-50 font-medium"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isPersonalizing ? "Creating..." : "Personalize"}
              </Button>
            )}
            
            {/* Add Files button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUploadFile(module.id)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
            >
              <Upload className="h-4 w-4 mr-2" />
              Add Files
            </Button>
            
            {/* Module Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  aria-label="Module actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEditModule?.(module)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Module
                </DropdownMenuItem>
                {onDeleteModule && (
                  <DropdownMenuItem 
                    onClick={() => onDeleteModule(module.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Module
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Module Content */}
      {module.isExpanded && (
        <div className="bg-gray-50">
          {/* Bulk Selection Header (show when there are files) */}
          {module.materials.length > 0 && onSelectFile && (
            <div className="px-6 py-3 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  aria-label="Select all files in module"
                />
                <span className="text-sm text-gray-600">
                  {allSelected ? 'Deselect all' : someSelected ? 'Select all' : 'Select all files'}
                </span>
              </div>
            </div>
          )}

          {/* Files List */}
          {module.materials.length > 0 ? (
            <div className="bg-white">
              {module.materials.map((material) => (
                <EnterpriseFileCard
                  key={material.id}
                  file={material}
                  onPreview={() => onViewMaterial(material)}
                  onDelete={onDeleteFile ? () => onDeleteFile(material.id, module.id) : undefined}
                  onPersonalize={() => onAskAI(material)}
                  isSelected={selectedFiles.has(material.id)}
                  onSelect={onSelectFile}
                  showActions={true}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="px-6 py-12 text-center bg-white">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FolderOpen className="h-8 w-8 text-gray-500" />
              </div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">No files yet</h4>
              <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                Upload PDFs, videos, or documents to get started with AI-powered learning.
              </p>
              <Button
                size="sm"
                onClick={() => onUploadFile(module.id)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 