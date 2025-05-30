import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  BookOpen, 
  ChevronDown, 
  ChevronRight, 
  Upload, 
  File, 
  Trash2,
  Loader2
} from "lucide-react";

import UploadPdf from "@/components/dashboard/UploadPDF";
import UploadAudio from "@/components/dashboard/AudioUpload";
import { Course } from '../hooks/useCourses';
import { Module } from '../hooks/useModules';

interface ModulesTabProps {
  course: Course;
  moduleHooks: {
    modules: Module[];
    loading: boolean;
    error: string | null;
    createModule: (moduleData: { title: string }) => Promise<Module | null>;
    updateModule: (moduleId: string, updateData: any) => Promise<Module | null>;
    deleteModule: (moduleId: string) => Promise<boolean>;
    addFileToModule: (moduleId: string, file: any) => void;
    removeFileFromModule: (moduleId: string, fileId: string) => void;
    getModuleById: (moduleId: string) => Module | undefined;
    refetch: () => void;
  };
}

export function ModulesTab({ course, moduleHooks }: ModulesTabProps) {
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [uploadingModuleId, setUploadingModuleId] = useState<string | null>(null);
  const [uploadingAudioModuleId, setUploadingAudioModuleId] = useState<string | null>(null);

  const { modules, loading, createModule, deleteModule } = moduleHooks;

  const handleCreateModule = async () => {
    if (!newModuleTitle.trim()) return;

    const newModule = await createModule({ title: newModuleTitle.trim() });
    if (newModule) {
      setNewModuleTitle("");
      setIsCreateDialogOpen(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    await deleteModule(moduleId);
  };

  const toggleModuleExpansion = (moduleId: string) => {
    setExpandedModuleId(expandedModuleId === moduleId ? null : moduleId);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-6 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modules Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <span>Course Modules</span>
              <Badge variant="secondary">{modules.length}</Badge>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Module</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Module</DialogTitle>
                  <DialogDescription>
                    Add a new module to organize your course content
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Module Title</label>
                    <Input
                      value={newModuleTitle}
                      onChange={(e) => setNewModuleTitle(e.target.value)}
                      placeholder="Enter module title..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateModule();
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setNewModuleTitle("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateModule}
                      disabled={!newModuleTitle.trim()}
                    >
                      Create Module
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Modules List */}
      {modules.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No modules yet
            </h3>
            <p className="text-gray-600 mb-4">
              Create your first module to start organizing course content
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Module
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {modules.map((module) => (
            <Card key={module.id}>
              <CardContent className="p-0">
                {/* Module Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleModuleExpansion(module.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {expandedModuleId === module.id ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      <div>
                        <h4 className="font-medium text-gray-900">{module.title}</h4>
                        <p className="text-sm text-gray-600">
                          {module.files.length} file{module.files.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Module</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "<strong>{module.title}</strong>"? 
                              This will also delete all files in this module. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteModule(module.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete Module
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>

                {/* Module Content (when expanded) */}
                {expandedModuleId === module.id && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    {/* Upload Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center space-x-2">
                            <Upload className="h-4 w-4" />
                            <span>Upload PDF</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {uploadingModuleId === module.id ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin" />
                              <span className="ml-2 text-sm">Uploading...</span>
                            </div>
                          ) : (
                            <UploadPdf
                              moduleId={module.id}
                              onUploadStart={() => setUploadingModuleId(module.id)}
                              onUploadComplete={() => {
                                setUploadingModuleId(null);
                                moduleHooks.refetch();
                              }}
                            />
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center space-x-2">
                            <Upload className="h-4 w-4" />
                            <span>Upload Audio</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {uploadingAudioModuleId === module.id ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin" />
                              <span className="ml-2 text-sm">Uploading...</span>
                            </div>
                          ) : (
                            <UploadAudio
                              moduleId={module.id}
                              onUploadStart={() => setUploadingAudioModuleId(module.id)}
                              onUploadComplete={() => {
                                setUploadingAudioModuleId(null);
                                moduleHooks.refetch();
                              }}
                            />
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Files List */}
                    {module.files.length > 0 ? (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">
                          Module Files ({module.files.length})
                        </h5>
                        <div className="space-y-2">
                          {module.files.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-3 bg-white rounded-lg border"
                            >
                              <div className="flex items-center space-x-3">
                                <File className="h-5 w-5 text-gray-400" />
                                <div>
                                  <p className="font-medium text-gray-900">{file.title}</p>
                                  {file.filename && (
                                    <p className="text-sm text-gray-600">{file.filename}</p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  // Handle file deletion
                                  moduleHooks.removeFileFromModule(module.id, file.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No files uploaded yet</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}