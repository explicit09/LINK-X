'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Plus, Upload, List, Grid3X3, Image } from 'lucide-react';
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
  file_size?: number;
  completed?: boolean;
  due_date?: string;
  points?: number;
}

type ViewMode = 'list' | 'grid' | 'icon';

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
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Get file type icon with proper styling
  const getFileIcon = (fileType: string, size: 'sm' | 'md' | 'lg' = 'sm') => {
    const sizeClasses = {
      sm: 'w-5 h-5',
      md: 'w-8 h-8', 
      lg: 'w-12 h-12'
    };
    
    const type = fileType.toLowerCase();
    const iconClass = sizeClasses[size];
    
    if (type.includes('pdf') || type.includes('document')) {
      return <div className={cn(iconClass, "text-red-600")}>📄</div>;
    } else if (type.includes('video') || type.includes('mp4') || type.includes('mov')) {
      return <div className={cn(iconClass, "text-blue-600")}>📹</div>;
    } else if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) {
      return <div className={cn(iconClass, "text-green-600")}>🖼️</div>;
    } else if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) {
      return <div className={cn(iconClass, "text-purple-600")}>🎵</div>;
    } else if (type.includes('presentation') || type.includes('powerpoint') || type.includes('ppt')) {
      return <div className={cn(iconClass, "text-orange-600")}>📊</div>;
    } else if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
      return <div className={cn(iconClass, "text-green-700")}>📈</div>;
    } else if (type.includes('zip') || type.includes('rar') || type.includes('archive')) {
      return <div className={cn(iconClass, "text-yellow-600")}>📦</div>;
    } else {
      return <div className={cn(iconClass, "text-gray-600")}>📄</div>;
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '--';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Render files in list view (detailed)
  const renderListView = (materials: Material[], moduleId: string) => (
    <div className="divide-y divide-gray-100">
      {materials.map((material) => (
        <div 
          key={material.id}
          className="flex items-center gap-4 px-5 py-4 hover:bg-blue-50 transition-all duration-200 cursor-pointer border-l-4 border-transparent hover:border-blue-400"
          onClick={() => onFileClick?.(moduleId, material.id)}
        >
          {/* File Icon & Name */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {getFileIcon(material.file_type, 'sm')}
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-gray-900 truncate">{material.title}</h4>
              {material.description && (
                <p className="text-sm text-gray-600 truncate">{material.description}</p>
              )}
            </div>
          </div>

          {/* File Size */}
          <div className="text-sm text-gray-500 hidden sm:block w-16 text-right">
            {formatFileSize(material.file_size)}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            {material.completed ? (
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                ✅ Complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                ⏳ Pending
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              👁️
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              ✨
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  // Render files in grid view (balanced)
  const renderGridView = (materials: Material[], moduleId: string) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {materials.map((material) => (
        <div 
          key={material.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
          onClick={() => onFileClick?.(moduleId, material.id)}
        >
          <div className="flex items-start gap-3">
            {getFileIcon(material.file_type, 'md')}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-sm truncate mb-1">{material.title}</h4>
              <p className="text-xs text-gray-500 mb-2">{formatFileSize(material.file_size)}</p>
              <div className="flex items-center justify-between">
                {material.completed ? (
                  <span className="text-xs text-green-600">✅ Complete</span>
                ) : (
                  <span className="text-xs text-gray-500">⏳ Pending</span>
                )}
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-xs">👁️</Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-xs">✨</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Render files in icon view (large visual)
  const renderIconView = (materials: Material[], moduleId: string) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 p-6">
      {materials.map((material) => (
        <div 
          key={material.id}
          className="text-center cursor-pointer group"
          onClick={() => onFileClick?.(moduleId, material.id)}
        >
          <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:border-blue-300 group-hover:scale-105">
            <div className="flex justify-center mb-3">
              {getFileIcon(material.file_type, 'lg')}
            </div>
            <h4 className="font-medium text-gray-900 text-sm truncate mb-1">{material.title}</h4>
            <p className="text-xs text-gray-500 mb-2">{formatFileSize(material.file_size)}</p>
            {material.completed ? (
              <span className="text-xs text-green-600">✅</span>
            ) : (
              <span className="text-xs text-gray-500">⏳</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // Render files based on current view mode
  const renderFilesByViewMode = (materials: Material[], moduleId: string) => {
    switch (viewMode) {
      case 'list':
        return renderListView(materials, moduleId);
      case 'grid':
        return renderGridView(materials, moduleId);
      case 'icon':
        return renderIconView(materials, moduleId);
      default:
        return renderListView(materials, moduleId);
    }
  };
  
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
          <div key={module.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            {/* Module Header */}
            <div
              className="flex items-center justify-between p-5 hover:bg-gray-50 cursor-pointer rounded-t-lg transition-colors"
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
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm text-gray-600 font-medium">
                        {completedItems} of {totalItems} items completed
                      </span>
                      <div className="flex-1 max-w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 min-w-[3rem] text-right">
                        {progressPercentage}%
                      </span>
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
                
                {/* View Toggle and Actions Bar */}
                {module.materials_list.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        {module.materials_list.length} files
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* View Mode Toggle */}
                      <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewMode('list');
                          }}
                          className="rounded-none border-0 h-8"
                          title="List View"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewMode('grid');
                          }}
                          className="rounded-none border-0 h-8"
                          title="Grid View"
                        >
                          <Grid3X3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'icon' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewMode('icon');
                          }}
                          className="rounded-none border-0 h-8"
                          title="Icon View"
                        >
                          <Image className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Upload Button */}
                      {isOwner && onUploadFile && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUploadFile(module.id);
                          }}
                          className="h-8"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Files
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Module Items */}
                {module.materials_list.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-500">
                    <p className="text-sm">No items in this module yet</p>
                    {isOwner && onUploadFile && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUploadFile(module.id);
                        }}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Content
                      </Button>
                    )}
                  </div>
                ) : (
                  renderFilesByViewMode(module.materials_list, module.id)
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}