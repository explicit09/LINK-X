'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Custom hooks
import { useModuleManager, Material } from './hooks/useModuleManager';
import { useFileUpload } from './hooks/useFileUpload';

// Components
import { ModuleHeader } from './components/ModuleHeader';
import { MaterialCard } from './components/MaterialCard';
import { UploadTile } from './components/UploadTile';
import { EmptyModuleState } from './components/EmptyModuleState';

export interface ModuleStreamProps {
  courseId: string;
  materials: Material[];
  onUploadComplete?: () => void;
  onViewMaterial?: (material: Material) => void;
  onAskAI?: (material: Material) => void;
  userRole?: 'instructor' | 'student';
  className?: string;
}

export function ModuleStream({
  courseId,
  materials,
  onUploadComplete,
  onViewMaterial,
  onAskAI,
  userRole = 'student',
  className = '',
}: ModuleStreamProps) {
  // Custom hooks
  const {
    modules,
    isLoading,
    createModule,
    updateModule,
    deleteModule,
    toggleModule,
    startEditing,
    cancelEditing,
    saveEdit,
    updateEditTitle,
    addMaterialToModule,
    removeMaterialFromModule,
    canModify,
  } = useModuleManager(courseId, userRole);

  const {
    uploadFile,
    handleFileInputChange,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    triggerFileInput,
    setFileInputRef,
    getUploadProgress,
    isModuleUploading,
    isModuleDragging,
    canUpload,
  } = useFileUpload(courseId, userRole);

  // Handle file upload with progress tracking
  const handleFileUploadWithProgress = async (moduleId: string, file: File) => {
    const material = await uploadFile(moduleId, file, {
      onComplete: (material) => {
        addMaterialToModule(moduleId, material);
        onUploadComplete?.();
      },
      onError: (error) => {
        console.error('Upload error:', error);
      },
    });

    return material;
  };

  // Handle file input change with module integration
  const handleModuleFileInputChange = (
    moduleId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      handleFileUploadWithProgress(moduleId, file);
    });

    // Reset file input
    e.target.value = '';
  };

  // Handle drag and drop with module integration
  const handleModuleDrop = (moduleId: string, e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      handleFileUploadWithProgress(moduleId, file);
    });
  };

  // Handle material deletion
  const handleDeleteMaterial = async (materialId: string) => {
    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete material');
      }

      // Find which module contains this material and remove it
      const moduleWithMaterial = modules.find((module) =>
        module.materials.some((material) => material.id === materialId),
      );

      if (moduleWithMaterial) {
        removeMaterialFromModule(moduleWithMaterial.id, materialId);
      }

      toast.success('Material deleted successfully');
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('Failed to delete material');
    }
  };

  // Handle module personalization (AI-generated content)
  const handlePersonalize = async (moduleId: string) => {
    try {
      toast.info('Generating personalized content...');

      const response = await fetch(`/api/modules/${moduleId}/personalize`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to personalize module');
      }

      toast.success('Module personalized successfully');
    } catch (error) {
      console.error('Error personalizing module:', error);
      toast.error('Failed to personalize module');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-6 w-6" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(2)].map((_, j) => (
                    <Skeleton key={j} className="h-24" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Empty state
  if (modules.length === 0) {
    return (
      <div className={className}>
        <EmptyModuleState
          onCreateModule={() => createModule()}
          canCreateModule={canModify}
        />
      </div>
    );
  }

  // Main render
  return (
    <div className={`space-y-6 ${className}`}>
      {modules.map((module) => (
        <Card key={module.id} className="group">
          <ModuleHeader
            module={module}
            canModify={canModify}
            onToggle={toggleModule}
            onStartEdit={startEditing}
            onSaveEdit={saveEdit}
            onCancelEdit={cancelEditing}
            onUpdateEditTitle={updateEditTitle}
            onDelete={deleteModule}
            onPersonalize={canModify ? handlePersonalize : undefined}
          />

          {module.isExpanded && (
            <CardContent className="p-6 pt-0">
              {module.materials.length === 0 && canUpload ? (
                <UploadTile
                  moduleId={module.id}
                  isUploading={isModuleUploading(module.id)}
                  uploadProgress={getUploadProgress(module.id)}
                  isDragging={isModuleDragging(module.id)}
                  canUpload={canUpload}
                  onFileSelect={triggerFileInput}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleModuleDrop}
                  setFileInputRef={setFileInputRef}
                  onFileInputChange={handleModuleFileInputChange}
                />
              ) : (
                <div className="space-y-4">
                  {/* Materials Grid */}
                  <div className="grid gap-4">
                    {module.materials.map((material) => (
                      <MaterialCard
                        key={material.id}
                        material={material}
                        canModify={canModify}
                        onView={onViewMaterial}
                        onAskAI={onAskAI}
                        onDelete={handleDeleteMaterial}
                      />
                    ))}
                  </div>

                  {/* Upload Tile at Bottom */}
                  {canUpload && (
                    <UploadTile
                      moduleId={module.id}
                      isUploading={isModuleUploading(module.id)}
                      uploadProgress={getUploadProgress(module.id)}
                      isDragging={isModuleDragging(module.id)}
                      canUpload={canUpload}
                      onFileSelect={triggerFileInput}
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDrop={handleModuleDrop}
                      setFileInputRef={setFileInputRef}
                      onFileInputChange={handleModuleFileInputChange}
                    />
                  )}
                </div>
              )}

              {module.materials.length === 0 && !canUpload && (
                <div className="text-center py-8 text-gray-500">
                  <p>No materials uploaded yet</p>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}

      {/* Add Module Button */}
      {canModify && (
        <div className="text-center">
          <Button
            onClick={() => createModule()}
            variant="outline"
            size="lg"
            className="border-dashed border-2"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Module
          </Button>
        </div>
      )}
    </div>
  );
}
