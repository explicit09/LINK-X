'use client';

import { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  FolderPlus,
  Folder,
  MoreVertical,
  Edit2,
  X,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast as sonnerToast } from 'sonner';
import { cn } from '@/lib/utils';
import { StudentCourseUpload } from './StudentCourseUpload';
import { useModules } from '@/lib/hooks/useDatabase';
import { moduleOperations, fileOperations } from '@/lib/db/operations';
import type { ModuleWithFiles, File } from '@/lib/db/types';
import { useRouter } from 'next/navigation';

interface StudentFileManagerProps {
  courseId: string;
  className?: string;
}

export function StudentFileManager({ courseId, className }: StudentFileManagerProps) {
  // ✅ NEW: Use direct Supabase operations
  const { modules, loading: isLoading, refetch: loadModules } = useModules(courseId);
  const router = useRouter();
  
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [showCreateModule, setShowCreateModule] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [editingModule, setEditingModule] = useState<ModuleWithFiles | null>(null);
  const [deletingFile, setDeletingFile] = useState<File | null>(null);
  const [deletingModule, setDeletingModule] = useState<ModuleWithFiles | null>(null);

  // Create module
  const handleCreateModule = async () => {
    if (!moduleTitle.trim()) {
      sonnerToast.error('Module title is required');
      return;
    }

    try {
      console.log('Creating module with:', { courseId, title: moduleTitle, description: moduleDescription });
      
      // ✅ NEW: Use direct Supabase operations
      await moduleOperations.createModule(courseId, {
        title: moduleTitle,
        description: moduleDescription,
        ordering: modules.length
      });
      
      console.log('Module created successfully');
      
      // Refresh modules list (hook will update automatically)
      loadModules();
      setShowCreateModule(false);
      setModuleTitle('');
      setModuleDescription('');
      sonnerToast.success('Module created successfully');
    } catch (error: any) {
      console.error('Failed to create module:', error);
      const errorMessage = error?.message || 'Failed to create module';
      sonnerToast.error(errorMessage);
    }
  };

  // Update module
  const handleUpdateModule = async () => {
    if (!editingModule || !moduleTitle.trim()) return;

    try {
      // ✅ NEW: Use direct Supabase operations
      await moduleOperations.updateModule(editingModule.id, {
        title: moduleTitle,
        description: moduleDescription
      });
      
      // Refresh modules list
      loadModules();
      setEditingModule(null);
      setModuleTitle('');
      setModuleDescription('');
      sonnerToast.success('Module updated successfully');
    } catch (error) {
      console.error('Failed to update module:', error);
      sonnerToast.error('Failed to update module');
    }
  };

  // Delete file
  const handleDeleteFile = async () => {
    if (!deletingFile) return;

    try {
      // ✅ NEW: Use direct Supabase operations
      await fileOperations.deleteFile(deletingFile.id);
      
      // Refresh modules list
      loadModules();
      setDeletingFile(null);
      sonnerToast.success('File deleted successfully');
    } catch (error) {
      console.error('Failed to delete file:', error);
      sonnerToast.error('Failed to delete file');
    }
  };

  // Delete module
  const handleDeleteModule = async () => {
    if (!deletingModule) return;

    try {
      // ✅ NEW: Use direct Supabase operations
      await moduleOperations.deleteModule(deletingModule.id);
      
      // Refresh modules list
      loadModules();
      setDeletingModule(null);
      sonnerToast.success('Module deleted successfully');
    } catch (error) {
      console.error('Failed to delete module:', error);
      sonnerToast.error('Failed to delete module. Make sure all files are deleted first.');
    }
  };

  // View file
  const handleViewFile = (file: File, module: ModuleWithFiles) => {
    // Navigate to the file viewer page
    router.push(`/courses/${courseId}/modules/${module.id}/files/${file.id}`);
  };

  // Download file
  const handleDownloadFile = async (file: File) => {
    try {
      // ✅ NEW: Use direct Supabase operations
      const downloadUrl = await fileOperations.getFileUrl(file.storage_path);
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
      sonnerToast.error('Failed to download file');
    }
  };

  // Handle upload complete
  const handleUploadComplete = (result: any) => {
    console.log('Upload completed with result:', result);
    loadModules();
    setShowUpload(false);
    setSelectedModule(null);
    sonnerToast.success('File uploaded successfully!');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <CardTitle className="text-xl font-semibold">Course Materials</CardTitle>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateModule(true)}
              className="flex items-center"
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              New Module
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedModule(null);
                setShowUpload(true);
              }}
              className="flex items-center"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading modules...
            </div>
          ) : modules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No modules yet. Create a module to start uploading files.
              </p>
              <Button onClick={() => setShowCreateModule(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create First Module
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {modules.map((module) => (
                <Card key={module.id}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Folder className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-medium">{module.title}</h3>
                        {module.description && (
                          <span className="text-sm text-muted-foreground">
                            - {module.description}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedModule(module.id);
                            setShowUpload(true);
                          }}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingModule(module);
                                setModuleTitle(module.title);
                                setModuleDescription(module.description || '');
                              }}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit Module
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingModule(module)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Module
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {module.files && module.files.length > 0 ? (
                      <div className="space-y-2">
                        {module.files.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{file.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(file.file_size)} • {file.file_type}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewFile(file, module)}
                                title="View file"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadFile(file)}
                                title="Download file"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingFile(file)}
                                title="Delete file"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No files in this module
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Module Dialog */}
      <Dialog open={showCreateModule} onOpenChange={setShowCreateModule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Module</DialogTitle>
            <DialogDescription>
              Create a new module to organize your course materials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="module-title">Module Title</Label>
              <Input
                id="module-title"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                placeholder="e.g., Week 1 Materials"
              />
            </div>
            <div>
              <Label htmlFor="module-description">Description (optional)</Label>
              <Textarea
                id="module-description"
                value={moduleDescription}
                onChange={(e) => setModuleDescription(e.target.value)}
                placeholder="Brief description of the module content"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModule(false);
                setModuleTitle('');
                setModuleDescription('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateModule}>Create Module</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Module Dialog */}
      <Dialog open={!!editingModule} onOpenChange={(open) => !open && setEditingModule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
            <DialogDescription>
              Update the module title and description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-module-title">Module Title</Label>
              <Input
                id="edit-module-title"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                placeholder="e.g., Week 1 Materials"
              />
            </div>
            <div>
              <Label htmlFor="edit-module-description">Description (optional)</Label>
              <Textarea
                id="edit-module-description"
                value={moduleDescription}
                onChange={(e) => setModuleDescription(e.target.value)}
                placeholder="Brief description of the module content"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingModule(null);
                setModuleTitle('');
                setModuleDescription('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateModule}>Update Module</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Upload Files {selectedModule ? `to ${modules.find(m => m.id === selectedModule)?.title}` : ''}
            </DialogTitle>
            <DialogDescription>
              {selectedModule 
                ? 'Upload files to your course. You can upload individual files or a complete course package.'
                : 'Please select a module first, or create a new module to upload files.'}
            </DialogDescription>
          </DialogHeader>
          {selectedModule ? (
            <StudentCourseUpload
              courseId={courseId}
              moduleId={selectedModule}
              onUploadComplete={handleUploadComplete}
            />
          ) : (
            <div className="space-y-4 py-8">
              <p className="text-center text-muted-foreground">
                You need to select a module before uploading files.
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModule(true)}
                >
                  Create Module
                </Button>
                <Button
                  onClick={() => setShowUpload(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete File Dialog */}
      <Dialog open={!!deletingFile} onOpenChange={(open) => !open && setDeletingFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingFile?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingFile(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFile}
            >
              Delete File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Module Dialog */}
      <Dialog open={!!deletingModule} onOpenChange={(open) => !open && setDeletingModule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Module</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingModule?.title}"? All files in this module will also be deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingModule(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteModule}
            >
              Delete Module
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}