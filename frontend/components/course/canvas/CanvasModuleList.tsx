'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CanvasModuleItem } from './CanvasModuleItem';

interface Module {
  id: string;
  title: string;
  description?: string;
  materials_list: Material[];
  progress: number;
  order_index: number;
  published?: boolean;
}

interface Material {
  id: string;
  title: string;
  description?: string;
  file_type: string;
  file_path?: string;
  completed?: boolean;
  due_date?: string;
  points?: number;
}

interface CanvasModuleListProps {
  modules: Module[];
  expandedModules: Set<string>;
  onToggleModule: (moduleId: string) => void;
  onFileClick?: (moduleId: string, fileId: string) => void;
  isOwner?: boolean;
  onAddModule?: () => void;
  onUploadFile?: (moduleId: string) => void;
  loading?: boolean;
  className?: string;
}

export function CanvasModuleList({
  modules,
  expandedModules,
  onToggleModule,
  onFileClick,
  isOwner = false,
  onAddModule,
  onUploadFile,
  loading = false,
  className
}: CanvasModuleListProps) {
  
  if (loading) {
    return (
      <div className={cn("space-y-1", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded p-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No modules yet</h3>
          <p className="text-gray-500 mb-4">
            {isOwner 
              ? "Create your first module to organize course content"
              : "No course content has been published yet"
            }
          </p>
          {isOwner && onAddModule && (
            <Button onClick={onAddModule} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Module
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Sort modules by order_index
  const sortedModules = [...modules].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  return (
    <div className={cn("space-y-1", className)}>
      {/* Add Module Button for Owners */}
      {isOwner && onAddModule && (
        <div className="mb-4">
          <Button 
            onClick={onAddModule}
            variant="outline"
            className="w-full justify-center border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Module
          </Button>
        </div>
      )}

      {/* Module List */}
      {sortedModules.map((module, index) => {
        const isExpanded = expandedModules.has(module.id);
        const completedItems = module.materials_list.filter(m => m.completed).length;
        const totalItems = module.materials_list.length;
        const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        return (
          <div key={module.id} className="bg-white border border-gray-200 rounded-sm">
            {/* Module Header */}
            <div
              className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => onToggleModule(module.id)}
            >
              <div className="flex items-center gap-3 flex-1">
                {/* Expand/Collapse Icon */}
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
                )}

                {/* Module Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 truncate">
                      Module {index + 1}: {module.title}
                    </h3>
                    {!module.published && isOwner && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                        Draft
                      </span>
                    )}
                  </div>
                  
                  {totalItems > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500">
                        {completedItems} of {totalItems} items completed
                      </span>
                      <div className="w-20 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-green-500 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{progressPercentage}%</span>
                    </div>
                  )}
                </div>

                {/* Owner Actions */}
                {isOwner && onUploadFile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUploadFile(module.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Module Content */}
            {isExpanded && (
              <div className="border-t border-gray-200">
                {module.description && (
                  <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600">
                    {module.description}
                  </div>
                )}
                
                {/* Module Items */}
                <div className="divide-y divide-gray-100">
                  {module.materials_list.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-500">
                      <p className="text-sm">No items in this module yet</p>
                      {isOwner && onUploadFile && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onUploadFile(module.id)}
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Content
                        </Button>
                      )}
                    </div>
                  ) : (
                    module.materials_list.map((material) => (
                      <CanvasModuleItem
                        key={material.id}
                        material={material}
                        moduleId={module.id}
                        onClick={onFileClick}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}