'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus, Upload, BookOpen, Search, Loader2 } from 'lucide-react';
import { EnhancedFileUpload } from '@/components/course/EnhancedFileUpload';
import { StudentCourseUpload } from '@/components/course/StudentCourseUpload';
import { SearchAndFilter } from '@/components/course/SearchAndFilter';
import { EnterpriseModuleCard } from '@/components/course/EnterpriseModuleCard';
import { useCourseContext, courseActions } from '../../context/CourseContext';
import { useModuleManager } from '../../hooks/useModuleManager';
import { useMaterialUpload } from '../../hooks/useMaterialUpload';
import { filterMaterials } from '../../utils/moduleStructure';
import { getCourseColor } from '../../utils/courseHelpers';
import { Material } from '../../types/course.types';

interface HomeTabProps {
  courseId: string;
  isFocusMode: boolean;
  onViewMaterial: (material: { id: string; title: string; type: Material["type"] }) => void;
  onAskAI: (material: { id: string; title: string; type: Material["type"] }) => void;
}

export const HomeTab = ({ courseId, isFocusMode, onViewMaterial, onAskAI }: HomeTabProps) => {
  const { state, dispatch } = useCourseContext();
  const { course, modules, currentUser, searchQuery, filters } = state;
  const { createModule, updateModule, deleteModule, toggleModule, isCreating } = useModuleManager(courseId);
  const { handleUploadComplete, deleteFile, bulkDeleteFiles, toggleFileSelection, selectedFiles } = useMaterialUpload(courseId);
  
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadModuleId, setUploadModuleId] = useState<string | undefined>(undefined);
  const [useAdvancedUpload, setUseAdvancedUpload] = useState(false);
  const [createModuleDialogOpen, setCreateModuleDialogOpen] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDescription, setNewModuleDescription] = useState("");
  
  // Edit module state
  const [editModuleDialogOpen, setEditModuleDialogOpen] = useState(false);
  const [moduleToEdit, setModuleToEdit] = useState<{ id: string; title: string; description?: string } | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState("");
  const [editModuleDescription, setEditModuleDescription] = useState("");

  const colors = getCourseColor(course?.id);

  // Filter modules and materials
  const filteredModules = modules.map(module => ({
    ...module,
    materials: filterMaterials(module.materials || [], searchQuery, filters)
  })).filter(module => 
    module.materials.length > 0 || (!searchQuery && filters.fileTypes.length === 0 && filters.aiProcessed === 'all' && filters.dateRange === 'all')
  );

  const totalFiles = modules.reduce((total, module) => total + module.materials.length, 0);
  const filteredFiles = filteredModules.reduce((total, module) => total + module.materials.length, 0);

  const handleCreateModule = () => {
    setCreateModuleDialogOpen(true);
    setNewModuleTitle("");
    setNewModuleDescription("");
  };

  const confirmCreateModule = async () => {
    const newModule = await createModule(newModuleTitle, newModuleDescription);
    if (newModule) {
      setCreateModuleDialogOpen(false);
      setNewModuleTitle("");
      setNewModuleDescription("");
    }
  };

  const handleEditModule = (module: { id: string; title: string; description?: string }) => {
    setModuleToEdit(module);
    setEditModuleTitle(module.title);
    setEditModuleDescription(module.description || "");
    setEditModuleDialogOpen(true);
  };

  const confirmUpdateModule = async () => {
    if (moduleToEdit) {
      const success = await updateModule(moduleToEdit.id, editModuleTitle, editModuleDescription);
      if (success) {
        setEditModuleDialogOpen(false);
        setModuleToEdit(null);
        setEditModuleTitle("");
        setEditModuleDescription("");
      }
    }
  };

  const handleDeleteFile = async (fileId: string, moduleId: string) => {
    const file = modules
      .find(module => module.id === moduleId)
      ?.materials.find(material => material.id === fileId);
    
    if (!file) return;

    if (window.confirm(`Are you sure you want to delete "${file.title}"?`)) {
      await deleteFile(fileId, moduleId);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    await deleteModule(moduleId);
  };

  const handleUploadCompleteWrapper = async (newFile: any) => {
    const success = await handleUploadComplete(newFile);
    if (success) {
      setTimeout(() => {
        setIsUploadDialogOpen(false);
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen">
      <div className={cn("mx-auto px-6 py-8 transition-all duration-200", 
        isFocusMode ? "max-w-4xl" : "max-w-6xl"
      )}>
        <div className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <div className={cn("w-2 h-6 rounded-full bg-gradient-to-b", colors.gradient)} />
                Course Materials
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCreateModule}
                  size="sm"
                  className="bg-[#7B61FF] hover:bg-[#6B51E5] text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Module
                </Button>
                <Button
                  onClick={() => setIsUploadDialogOpen(true)}
                  size="sm"
                  variant="outline"
                  className="border-[#7B61FF] text-[#7B61FF] hover:bg-[#7B61FF] hover:text-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-4">
              {totalFiles > 0 && (
                <div className="mb-6">
                  <SearchAndFilter
                    onSearch={(query) => dispatch(courseActions.setSearchQuery(query))}
                    onFilterChange={(newFilters) => dispatch(courseActions.setFilters(newFilters))}
                    totalFiles={totalFiles}
                    filteredFiles={filteredFiles}
                  />
                </div>
              )}
              
              <div className="space-y-6">
                {filteredModules.map((module) => (
                  <EnterpriseModuleCard
                    key={module.id}
                    module={module}
                    onToggle={() => toggleModule(module.id)}
                    onViewMaterial={onViewMaterial}
                    onUploadFile={() => {
                      setUploadModuleId(module.id);
                      setIsUploadDialogOpen(true);
                    }}
                    onAskAI={onAskAI}
                    onDeleteFile={handleDeleteFile}
                    onDeleteModule={handleDeleteModule}
                    onEditModule={handleEditModule}
                    selectedFiles={selectedFiles}
                    onSelectFile={(fileId, selected) => toggleFileSelection(fileId)}
                    onBulkAction={bulkDeleteFiles}
                  />
                ))}
                
                {filteredModules.length === 0 && modules.length === 0 && (
                  <div className="text-center py-12">
                    <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No modules yet
                    </h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                      Create your first module to start organizing course materials and unlock AI-powered learning features.
                    </p>
                    <Button
                      onClick={handleCreateModule}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Module
                    </Button>
                  </div>
                )}
                
                {filteredModules.length === 0 && modules.length > 0 && (
                  <div className="text-center py-12">
                    <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No files match your search
                    </h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                      Try adjusting your search terms or filters to find what you're looking for.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        dispatch(courseActions.setSearchQuery(""));
                        dispatch(courseActions.setFilters({
                          fileTypes: [],
                          aiProcessed: 'all',
                          dateRange: 'all',
                        }));
                      }}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Clear all filters
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Upload Course Materials</DialogTitle>
              {currentUser?.role === 'student' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant={useAdvancedUpload ? "outline" : "default"}
                    size="sm"
                    onClick={() => setUseAdvancedUpload(false)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Simple
                  </Button>
                  <Button
                    variant={useAdvancedUpload ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUseAdvancedUpload(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Advanced
                  </Button>
                </div>
              )}
            </div>
            <DialogDescription>
              Upload PDF, audio, video, or presentation files to your course. Files will be automatically processed for AI interaction.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mb-4">
            <label htmlFor="module-select" className="text-sm font-medium text-gray-700 block mb-2">
              Select Module *
            </label>
            <select
              id="module-select"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7B61FF]"
              value={uploadModuleId || ""}
              onChange={(e) => setUploadModuleId(e.target.value || undefined)}
            >
              <option value="">Select a module</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
          </div>
          
          {useAdvancedUpload && currentUser?.role === 'student' ? (
            <StudentCourseUpload
              courseId={courseId}
              moduleId={uploadModuleId}
              onUploadComplete={handleUploadCompleteWrapper}
            />
          ) : (
            <EnhancedFileUpload 
              courseId={courseId}
              moduleId={uploadModuleId}
              userRole={currentUser?.role || 'student'}
              onUploadComplete={handleUploadCompleteWrapper}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Module Dialog */}
      <Dialog open={createModuleDialogOpen} onOpenChange={setCreateModuleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Module</DialogTitle>
            <DialogDescription>
              Add a new module to organize your course materials.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="module-title" className="text-sm font-medium text-gray-700 block mb-2">
                Module Title *
              </label>
              <Input
                id="module-title"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                placeholder="e.g., Week 1: Introduction"
                className="w-full"
              />
            </div>
            
            <div>
              <label htmlFor="module-description" className="text-sm font-medium text-gray-700 block mb-2">
                Description (optional)
              </label>
              <Input
                id="module-description"
                value={newModuleDescription}
                onChange={(e) => setNewModuleDescription(e.target.value)}
                placeholder="Brief description of the module content"
                className="w-full"
              />
            </div>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setCreateModuleDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmCreateModule}
              disabled={isCreating || !newModuleTitle.trim()}
              className="bg-[#7B61FF] hover:bg-[#6B51E5] text-white"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Module
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Module Dialog */}
      <Dialog open={editModuleDialogOpen} onOpenChange={setEditModuleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
            <DialogDescription>
              Update the module title and description.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-module-title" className="text-sm font-medium text-gray-700 block mb-2">
                Module Title *
              </label>
              <Input
                id="edit-module-title"
                value={editModuleTitle}
                onChange={(e) => setEditModuleTitle(e.target.value)}
                placeholder="e.g., Week 1: Introduction"
                className="w-full"
              />
            </div>
            
            <div>
              <label htmlFor="edit-module-description" className="text-sm font-medium text-gray-700 block mb-2">
                Description (optional)
              </label>
              <Input
                id="edit-module-description"
                value={editModuleDescription}
                onChange={(e) => setEditModuleDescription(e.target.value)}
                placeholder="Brief description of the module content"
                className="w-full"
              />
            </div>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setEditModuleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmUpdateModule}
              disabled={!editModuleTitle.trim()}
              className="bg-[#7B61FF] hover:bg-[#6B51E5] text-white"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};