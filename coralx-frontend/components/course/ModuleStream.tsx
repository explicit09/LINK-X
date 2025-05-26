"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronRight, 
  MoreHorizontal, 
  Sparkles, 
  Upload, 
  FileText, 
  Video, 
  Mic, 
  Trash2,
  Edit,
  Plus,
  FolderOpen
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useSmartToast } from '@/hooks/use-smart-toast';
import { PDFThumbnail } from './PDFThumbnail';
import { studentAPI, instructorAPI } from '@/lib/api';

interface Material {
  id: string;
  title: string;
  type: "pdf" | "audio" | "video" | "document";
  size?: string;
  uploadedAt: string;
  processed?: boolean;
  moduleId?: string;
  moduleName?: string;
}

interface Module {
  id: string;
  title: string;
  materials: Material[];
  isExpanded: boolean;
}

interface ModuleStreamProps {
  courseId: string;
  materials: Material[];
  onUploadComplete: (file: any) => void;
  onViewMaterial: (material: { id: string; title: string; type: Material["type"] }) => void;
  onAskAI: (material: { id: string; title: string; type: Material["type"] }) => void;
  userRole: string;
}

export function ModuleStream({ 
  courseId, 
  materials, 
  onUploadComplete, 
  onViewMaterial, 
  onAskAI, 
  userRole 
}: ModuleStreamProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const toast = useSmartToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load modules from backend and group materials
  useEffect(() => {
    // Only run once or when courseId/userRole changes, not on every materials change
    if (!courseId || !userRole || hasInitialized) return;
    
    const loadModulesFromBackend = async () => {
      try {
        setIsLoading(true);
        
        // Fetch modules from the appropriate API based on user role
        const endpoint = userRole === 'student' 
          ? `/student/courses/${courseId}/modules`
          : `/instructor/courses/${courseId}/modules`;
          
        console.log('Loading modules from:', endpoint);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${endpoint}`, {
          method: 'GET',
          credentials: 'include',
        });

        console.log('Modules API response:', response.status);

        if (response.ok) {
          const backendModules = await response.json();
          console.log('Backend modules loaded:', backendModules);
          
          // Validate backend response
          if (!Array.isArray(backendModules)) {
            console.warn('Backend modules response is not an array:', backendModules);
            throw new Error('Invalid backend response format');
          }
          
          // Create modules from backend, we'll update materials separately
          const moduleList: Module[] = backendModules
            .filter(backendModule => backendModule && backendModule.id) // Filter out invalid modules
            .map((backendModule: any) => ({
              id: backendModule.id,
              title: backendModule.title || 'Untitled Module',
              materials: [], // Will be populated when materials update
              isExpanded: true // Default to expanded so users can see content
            }));

          console.log('Setting modules:', moduleList);
          setModules(moduleList);
        } else if (response.status === 404) {
          console.info('Modules endpoint not found - will handle in materials effect');
          // Don't create modules here, let the materials effect handle it
          setModules([]);
        } else {
          console.warn(`Modules API returned ${response.status}: ${response.statusText}`);
          // Don't throw error, just set empty modules and let materials effect handle it
          setModules([]);
        }
      } catch (error) {
        console.warn('Failed to load modules from backend:', error);
        // Don't create default module here, let the materials effect handle it
        setModules([]);
      } finally {
        setIsLoading(false);
        setHasInitialized(true);
      }
    };

    loadModulesFromBackend();
  }, [courseId, userRole, hasInitialized]);

  // Separate effect to update materials in modules
  useEffect(() => {
    if (!hasInitialized) return;
    
    console.log('Updating materials in modules:', materials);
    console.log('Current modules:', modules);
    
    // If we have materials but no modules, create a default module
    if (materials.length > 0 && modules.length === 0) {
      console.log('Creating default module for materials without modules');
      setModules([{
        id: 'default',
        title: 'Course Materials',
        materials: [...materials],
        isExpanded: true
      }]);
      return;
    }
    
    // If we have both materials and modules, group them properly
    if (materials.length > 0 && modules.length > 0) {
      // Group materials by module ID
      const moduleMap = new Map<string, Material[]>();
      const unmatchedMaterials: Material[] = [];
      
      materials.forEach(material => {
        if (material.moduleId) {
          // Check if we have a module with this ID
          const moduleExists = modules.some(m => m.id === material.moduleId);
          if (moduleExists) {
            if (!moduleMap.has(material.moduleId)) {
              moduleMap.set(material.moduleId, []);
            }
            moduleMap.get(material.moduleId)!.push(material);
          } else {
            // Module doesn't exist yet, save for later
            unmatchedMaterials.push(material);
          }
        } else {
          unmatchedMaterials.push(material);
        }
      });

      // Update modules with their materials
      setModules(prevModules => {
        const updatedModules = prevModules.map(module => ({
          ...module,
          materials: moduleMap.get(module.id) || []
        }));
        
        // If we have unmatched materials, add them to the first module or create a default module
        if (unmatchedMaterials.length > 0) {
          if (updatedModules.length > 0) {
            updatedModules[0] = {
              ...updatedModules[0],
              materials: [...updatedModules[0].materials, ...unmatchedMaterials]
            };
          } else {
            // No modules exist, create a default one
            updatedModules.push({
              id: 'default',
              title: 'Course Materials',
              materials: [...unmatchedMaterials],
              isExpanded: true
            });
          }
        }
        
        console.log('Updated modules with materials:', updatedModules);
        return updatedModules;
      });
    }
  }, [materials, modules.length, hasInitialized]);

  // File upload functionality
  const acceptedTypes = {
    'application/pdf': ['.pdf'],
    'audio/*': ['.mp3', '.wav', '.m4a', '.aac'],
    'video/*': ['.mp4', '.mov', '.avi'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUploadTime = (uploadedAt: string) => {
    try {
      const date = new Date(uploadedAt);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString();
    } catch {
      return uploadedAt; // Fallback to original string
    }
  };

  const validateFile = (file: File): string | null => {
    // Size validation (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      return "File size must be less than 100MB";
    }

    // Type validation
    const isValidType = Object.keys(acceptedTypes).some(type => {
      if (type.includes('*')) {
        return file.type.startsWith(type.replace('*', ''));
      }
      return file.type === type;
    });

    if (!isValidType) {
      return "File type not supported. Please upload PDF, audio, video, or presentation files.";
    }

    return null;
  };

  const uploadFile = async (file: File, moduleId: string) => {
    const uploadToast = toast.loading(`Uploading ${file.name}...`, {
      description: "Processing file for AI features"
    });

    try {
      // Create FormData for file upload with module association
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('description', `Uploaded to module: ${modules.find(m => m.id === moduleId)?.title || 'Course Materials'}`);
      formData.append('moduleId', moduleId); // Critical: Include moduleId for backend association
      
      let result;
      
      if (userRole === 'student') {
        // For students, use the course upload endpoint but include moduleId
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/student/courses/${courseId}/files`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        result = await response.json();
      } else {
        // For instructors, upload directly to the module
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/instructor/modules/${moduleId}/files/upload`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        result = await response.json();
      }

      // Create new material object with proper module association
      const newMaterial: Material = {
        id: result.id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Ensure we have an ID
        title: result.title || file.name,
        type: file.type.includes('pdf') ? 'pdf' : 
              file.type.includes('audio') ? 'audio' : 
              file.type.includes('video') ? 'video' : 'document',
        size: formatFileSize(result.file_size || file.size),
        uploadedAt: new Date().toISOString(), // Use ISO string for better persistence
        processed: true,
        moduleId: result.module_id || moduleId, // Use the module_id returned from backend
        moduleName: modules.find(m => m.id === (result.module_id || moduleId))?.title || 'Course Materials'
      };

      console.log('Created new material:', newMaterial);

      // Update the modules state to include the new file
      setModules(prev => {
        const updated = prev.map(module => 
          module.id === moduleId
            ? { ...module, materials: [...module.materials, newMaterial] }
            : module
        );
        console.log('Updated modules after upload:', updated);
        return updated;
      });

      // Call the parent upload complete handler with module info
      onUploadComplete({
        ...newMaterial,
        moduleId: moduleId,
        moduleName: modules.find(m => m.id === moduleId)?.title
      });

      toast.success(`${file.name} uploaded successfully!`, {
        id: uploadToast,
        description: "File ready for AI interaction"
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${file.name}`, {
        id: uploadToast,
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  const handleFiles = useCallback((files: FileList, moduleId: string) => {
    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }

      uploadFile(file, moduleId);
    });
  }, [uploadFile, validateFile, toast]);

  const handleFileSelect = useCallback((moduleId: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files) {
          handleFiles(files, moduleId);
        }
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      fileInputRef.current.click();
    }
  }, [handleFiles]);

  // Debug logging for materials updates
  useEffect(() => {
    console.log('Materials prop updated:', materials);
    console.log('Current modules state:', modules);
    
    if (hasInitialized && materials.length > 0) {
      const totalMaterialsInModules = modules.reduce((total, module) => total + module.materials.length, 0);
      const materialsWithModuleId = materials.filter(m => m.moduleId);
      const materialsWithoutModuleId = materials.filter(m => !m.moduleId);
      
      console.log(`Materials analysis:
        - Total materials: ${materials.length}
        - Materials with moduleId: ${materialsWithModuleId.length}
        - Materials without moduleId: ${materialsWithoutModuleId.length}
        - Materials currently in modules: ${totalMaterialsInModules}`);
    }
  }, [materials, modules, hasInitialized]);

  const handleCreateModule = async () => {
    // Use a simple default title without week numbering
    const defaultTitle = "New Module";

    console.log('Creating module:', defaultTitle);
    const createToast = toast.loading("Creating module...", {
      description: "Setting up your new course module"
    });

    try {
      // Create module on backend
      const endpoint = userRole === 'student' 
        ? `/student/courses/${courseId}/modules`
        : `/instructor/courses/${courseId}/modules`;
      
      console.log('Creating module at endpoint:', endpoint);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: defaultTitle,
        }),
      });

      console.log('Create module response:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Create module error:', errorText);
        throw new Error(`Failed to create module: ${response.statusText}`);
      }

      const backendModule = await response.json();
      console.log('Created module:', backendModule);
      
      // Create local module object with backend ID
      const newModule: Module = {
        id: backendModule.id,
        title: backendModule.title,
        materials: [],
        isExpanded: true // Always expand new modules for immediate use
      };
      
      // Ensure no duplicate modules
      setModules(prev => {
        const existingIndex = prev.findIndex(m => m.id === newModule.id);
        if (existingIndex >= 0) {
          // Replace existing module
          const updated = [...prev];
          updated[existingIndex] = newModule;
          return updated;
        }
        return [...prev, newModule];
      });
      setEditingModuleId(newModule.id);
      setNewModuleTitle(backendModule.title);
      
      toast.success("New module created. Rename it ↵.", {
        id: createToast,
        description: "Module saved to course"
      });
    } catch (error) {
      console.error('Failed to create module:', error);
      toast.error("Failed to create module", {
        id: createToast,
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  const handleSaveModuleTitle = async (moduleId: string) => {
    if (!newModuleTitle.trim()) {
      toast.error("Module title cannot be empty");
      return;
    }

    const updateToast = toast.loading("Saving module title to backend...");

    try {
      // Use the proper endpoint based on user role
      const endpoint = userRole === 'student' 
        ? `/student/modules/${moduleId}`
        : `/instructor/modules/${moduleId}`;
      
      console.log(`Attempting to update module ${moduleId} title to: "${newModuleTitle.trim()}"`);
      
      // Try PUT method (most RESTful for updates)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: newModuleTitle.trim(),
        }),
      });

      console.log(`Backend response: ${response.status} ${response.statusText}`);

      if (response.ok) {
        // Success - update was saved to backend
        const updatedModule = await response.json();
        console.log('Module updated successfully on backend:', updatedModule);
        
        setModules(prev => 
          prev.map(module => 
            module.id === moduleId 
              ? { ...module, title: updatedModule.title || newModuleTitle.trim() }
              : module
          )
        );
        
        toast.success("Module renamed and saved", {
          id: updateToast,
          description: "Changes saved to database"
        });
      } else if (response.status === 405) {
        // Method not allowed - backend doesn't support PUT for this endpoint
        console.warn('Backend does not support PUT method for module updates');
        
        // Update locally but warn user
        setModules(prev => 
          prev.map(module => 
            module.id === moduleId 
              ? { ...module, title: newModuleTitle.trim() }
              : module
          )
        );
        
        toast.error("Backend doesn't support module renaming", {
          id: updateToast,
          description: "Changes saved locally only - will reset on refresh"
        });
      } else {
        // Other error
        throw new Error(`Backend error: ${response.status} ${response.statusText}`);
      }
      
      setEditingModuleId(null);
      setNewModuleTitle("");
      
    } catch (error) {
      console.error('Failed to update module title on backend:', error);
      
      // Update locally as fallback but make it clear this is temporary
      setModules(prev => 
        prev.map(module => 
          module.id === moduleId 
            ? { ...module, title: newModuleTitle.trim() }
            : module
        )
      );
      
      setEditingModuleId(null);
      setNewModuleTitle("");
      
      toast.error("Failed to save module name", {
        id: updateToast,
        description: "Backend connection failed. Changes are temporary."
      });
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    const moduleToDelete = modules.find(m => m.id === moduleId);
    if (moduleToDelete && moduleToDelete.materials.length > 0) {
      toast.error("Cannot delete module with files. Remove files first.");
      return;
    }

    const deleteToast = toast.loading("Deleting module...");

    try {
      // Delete module from backend
      const endpoint = userRole === 'student' 
        ? `/student/modules/${moduleId}`
        : `/instructor/modules/${moduleId}`;
        
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${endpoint}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete module: ${response.statusText}`);
      }

      // Update local state
      setModules(prev => prev.filter(m => m.id !== moduleId));
      
      toast.success("Module deleted", {
        id: deleteToast,
        description: "Permanently removed from course",
        action: {
          label: "Undo",
          onClick: async () => {
            // Re-create the module
            if (moduleToDelete) {
              try {
                const endpoint = userRole === 'student' 
                  ? `/student/courses/${courseId}/modules`
                  : `/instructor/courses/${courseId}/modules`;
                  
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${endpoint}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include',
                  body: JSON.stringify({
                    title: moduleToDelete.title,
                  }),
                });

                if (response.ok) {
                  const recreatedModule = await response.json();
                  setModules(prev => [...prev, {
                    ...moduleToDelete,
                    id: recreatedModule.id,
                    materials: [] // Start fresh since files would be lost
                  }]);
                  toast.success("Module restored");
                }
              } catch (error) {
                toast.error("Failed to restore module");
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Failed to delete module:', error);
      toast.error("Failed to delete module", {
        id: deleteToast,
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  const toggleModule = (moduleId: string) => {
    setModules(prev => 
      prev.map(module => 
        module.id === moduleId 
          ? { ...module, isExpanded: !module.isExpanded }
          : module
      )
    );
  };

  const handlePersonalizeAll = async (module: Module) => {
    if (module.materials.length === 0) {
      toast.error("No files to personalize in this module");
      return;
    }

    const loadingToast = toast.loading(`Generate study plan from ${module.materials.length} files`, {
      description: "Starting personalized content generation..."
    });

    try {
      // Get user profile for personalization
      const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/student/profile`, {
        method: "GET",
        credentials: "include",
      });

      if (!profileResponse.ok) {
        throw new Error("Please complete your profile setup first");
      }

      const profile = await profileResponse.json();
      const onboard_answers = profile.onboard_answers || {};
      
      const name = profile.name || "Student";
      const userProfile = {
        role: onboard_answers.role || "student",
        traits: onboard_answers.traits || "curious and analytical",
        learningStyle: onboard_answers.learning_style || "visual learning",
        depth: onboard_answers.depth || "comprehensive",
        interests: onboard_answers.interests || "technology and innovation",
        personalization: onboard_answers.personalization || "examples and analogies",
        schedule: onboard_answers.schedule || "flexible learning",
      };

      // Step 1: Start the personalization task
      const startResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/generatepersonalizedmodulecontent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          moduleId: module.id,
          name: name,
          userProfile: userProfile
        }),
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json().catch(() => ({}));
        if (startResponse.status === 404) {
          throw new Error("Module not found. Please refresh the page and try again.");
        } else if (startResponse.status === 400) {
          throw new Error(errorData.error || "Invalid request. Please check that all files in the module are properly processed.");
        } else if (startResponse.status === 500) {
          throw new Error("Server error occurred. Please try again in a few moments.");
        } else if (startResponse.status === 202 && errorData.error === "PROCESSING") {
          throw new Error("Files in this module are still being processed. Please try again in a moment.");
        }
        throw new Error(`Failed to start personalized content generation: ${startResponse.status}`);
      }

      const taskData = await startResponse.json();
      const taskId = taskData.task_id;

      if (!taskId) {
        throw new Error("Failed to start personalization task");
      }

      // Step 2: Poll the task status
      const pollTaskStatus = async (attempt = 1): Promise<any> => {
        try {
          if (attempt <= 3) {
            toast.loading(`Generate study plan from ${module.materials.length} files`, {
              description: "Analyzing your learning profile and preparing content...",
              id: loadingToast
            });
          } else if (attempt <= 6) {
            toast.loading(`Generate study plan from ${module.materials.length} files`, {
              description: "Processing module content and generating personalized study guide...",
              id: loadingToast
            });
          } else if (attempt <= 9) {
            toast.loading(`Generate study plan from ${module.materials.length} files`, {
              description: "Finalizing your personalized content...",
              id: loadingToast
            });
          } else {
            toast.loading(`Generate study plan from ${module.materials.length} files`, {
              description: "Almost ready... putting the finishing touches...",
              id: loadingToast
            });
          }

          const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/personalization/status/${taskId}`, {
            method: "GET",
            credentials: "include",
          });

          if (!statusResponse.ok) {
            throw new Error(`Failed to check task status: ${statusResponse.status}`);
          }

          const statusData = await statusResponse.json();

          if (statusData.status === 'completed') {
            toast.success("Study guide created successfully!", {
              id: loadingToast,
              description: `Generated personalized content from ${module.materials.length} files`
            });

            // Navigate to the learn page
            setTimeout(() => {
              window.location.href = `/learn/${statusData.result.file_id}`;
            }, 1000);
            return statusData.result;
          } else if (statusData.status === 'failed') {
            throw new Error(statusData.error || "Task failed");
          } else if (statusData.status === 'processing') {
            if (attempt >= 24) { // Increased timeout to 2 minutes (24 * 5 seconds)
              throw new Error("Processing is taking longer than expected. Please try again later or check if your files are still being processed.");
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
            return pollTaskStatus(attempt + 1);
          } else {
            throw new Error(`Unknown task status: ${statusData.status}`);
          }

        } catch (error) {
          if (attempt < 24 && (error instanceof TypeError || (error instanceof Error && error.message.includes('fetch')))) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            return pollTaskStatus(attempt + 1);
          }
          throw error;
        }
      };

      await pollTaskStatus();

    } catch (error) {
      console.error("Error creating personalized module content:", error);
      
      let errorMessage = "Failed to create personalized study guide";
      let errorDescription = "Please try again";

      if (error instanceof Error) {
        if (error.message.includes("profile")) {
          errorMessage = "Profile not found";
          errorDescription = "Please complete your onboarding first";
        } else if (error.message.includes("longer than expected")) {
          errorMessage = "Processing timeout";
          errorDescription = "Your files may still be processing. Please try again in a few minutes.";
        } else if (error.message.includes("not found")) {
          errorMessage = "Module not found";
          errorDescription = "Please refresh the page and try again";
        } else if (error.message.includes("processed")) {
          errorMessage = "Files not ready";
          errorDescription = "Please wait for all files to finish processing";
        } else if (error.message.includes("Server error")) {
          errorMessage = "Server error";
          errorDescription = "Please try again in a few moments";
        }
      }

      toast.error(errorMessage, {
        id: loadingToast,
        description: errorDescription
      });
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    const deleteToast = toast.loading("Deleting file...");

    // Optimistically remove from UI
    setModules(prev =>
      prev.map(module => ({
        ...module,
        materials: module.materials.filter(m => m.id !== materialId)
      }))
    );

    try {
      const endpoint = userRole === 'student'
        ? `/student/files/${materialId}`
        : `/instructor/files/${materialId}`;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${endpoint}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.statusText}`);
      }

      toast.success("File deleted", { id: deleteToast });
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error("Failed to delete file", { id: deleteToast });
    }
  };

  const getFileIcon = (type: Material["type"]) => {
    switch (type) {
      case "pdf": return FileText;
      case "audio": return Mic;
      case "video": return Video;
      default: return FileText;
    }
  };

  const getFileColor = (type: Material["type"]) => {
    switch (type) {
      case "pdf": return "text-red-600";
      case "audio": return "text-purple-600";
      case "video": return "text-blue-600";
      default: return "text-gray-600";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent, moduleId: string) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    
    if (files.length === 0) return;
    
    handleFiles(files, moduleId);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[20vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7B61FF] mx-auto mb-4"></div>
          <p className="text-gray-500">Loading course modules...</p>
        </div>
      </div>
    );
  }

  // Show empty state with materials count info
  if (modules.length === 0) {
    return (
      <div className="flex items-center justify-center h-[30vh]">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No modules yet</h3>
          <p className="text-gray-500 mb-4 max-w-sm text-sm leading-relaxed">
            {materials.length > 0 ? 
              `You have ${materials.length} materials waiting to be organized. Create your first module to get started.` :
              'Create your first module to start organizing course materials.'
            }
          </p>
          <div className="space-y-3">
            <Button onClick={handleCreateModule} className="bg-[#7B61FF] hover:bg-[#6B51E5] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Module
            </Button>
            <div className="text-xs text-gray-400">
              <p>💡 Tip: Modules help organize your course content by week or topic</p>
              {materials.length > 0 && (
                <p className="mt-1">Materials will be automatically organized when you create modules</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Module Stream */}
      <div className="space-y-4">
        {modules.map((module) => (
          <Card key={module.id} className="bg-white/90 backdrop-blur-sm shadow-sm border-0 rounded-xl hover:shadow-md transition-all duration-200">
            {/* Module Header Bar */}
            <div 
              className="flex items-center justify-between p-4 hover:bg-muted/60 transition-colors duration-150 cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-[#7B61FF]/20"
              onClick={(e) => {
                // Only toggle if not clicking on interactive elements
                if (editingModuleId === module.id) return;
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('[role="button"]') || target.closest('input')) return;
                toggleModule(module.id);
              }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleModule(module.id);
                  }}
                  className="p-1 hover:bg-gray-200 rounded transition-colors duration-150"
                >
                  {module.isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  )}
                </button>
                
                {editingModuleId === module.id ? (
                  <Input
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    onBlur={() => handleSaveModuleTitle(module.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveModuleTitle(module.id);
                      }
                      if (e.key === 'Escape') {
                        setEditingModuleId(null);
                        setNewModuleTitle("");
                      }
                    }}
                    className="text-xl font-medium border-none p-0 h-auto focus:ring-0"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <h2 
                    className="text-lg font-semibold text-gray-900 leading-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingModuleId(module.id);
                      setNewModuleTitle(module.title);
                    }}
                  >
                    {module.title}
                  </h2>
                )}
                
                <span className="text-sm text-gray-500">
                  {module.materials.length} {module.materials.length === 1 ? 'file' : 'files'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {module.materials.length > 0 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePersonalizeAll(module);
                    }}
                    className="border-[#7B61FF] text-[#7B61FF] hover:bg-[#7B61FF] hover:text-white transition-all duration-150"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Personalize
                  </Button>
                ) : (
                  <span className="text-xs text-gray-500 italic">(Empty) Click to add files</span>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="hover:bg-gray-200 transition-colors duration-150"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClickCapture={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48" side="bottom">
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setEditingModuleId(module.id);
                        setNewModuleTitle(module.title);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Rename Module
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        handleDeleteModule(module.id);
                      }}
                      className="flex items-center gap-2 text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Module
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Module Content Area - Show if expanded */}
            {module.isExpanded && (
              <CardContent className="px-4 pb-4">
                {/* Conditional layout: centered when empty, grid when has files */}
                {module.materials.length === 0 ? (
                  /* Centered upload tile for empty modules */
                  <div className="flex justify-center items-center min-h-[180px]">
                    <div
                      className="aspect-square w-[160px] border border-gray-200 rounded-lg flex flex-col items-center justify-center text-center bg-white shadow-xs hover:ring-2 hover:ring-[#7B61FF] hover:scale-[1.02] transition-all duration-150 cursor-pointer"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, module.id)}
                      onClick={() => handleFileSelect(module.id)}
                    >
                      {/* Friendly SVG Mascot */}
                      <svg className="h-12 w-12 text-gray-400 mb-3" viewBox="0 0 100 100" fill="none">
                        <circle cx="50" cy="35" r="12" fill="currentColor" opacity="0.3"/>
                        <circle cx="45" cy="32" r="2" fill="currentColor"/>
                        <circle cx="55" cy="32" r="2" fill="currentColor"/>
                        <path d="M45 38 Q50 42 55 38" stroke="currentColor" strokeWidth="2" fill="none"/>
                        <rect x="40" y="45" width="20" height="25" rx="3" fill="currentColor" opacity="0.3"/>
                        <path d="M35 60 L50 45 L65 60" stroke="currentColor" strokeWidth="2" fill="none"/>
                        <circle cx="30" cy="75" r="3" fill="currentColor" opacity="0.5"/>
                        <circle cx="70" cy="75" r="3" fill="currentColor" opacity="0.5"/>
                        <path d="M40 80 Q50 85 60 80" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4"/>
                      </svg>
                      <p className="text-sm font-medium text-gray-700 px-3 leading-tight">
                        Add files
                      </p>
                      <p className="text-xs text-gray-500 mt-2 px-3">
                        Drag &amp; drop here
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Horizontal grid layout - upload tile flows to end */
                  <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                    {/* Existing materials first */}
                    {module.materials.map((material, index) => {
                      const IconComponent = getFileIcon(material.type);
                      const iconColor = getFileColor(material.type);
                      
                      return (
                        <Card 
                          key={`${material.id}-${index}`}
                          className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer bg-white border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] rounded-xl min-h-[180px] flex flex-col"
                          onClick={() => onViewMaterial({
                            id: material.id,
                            title: material.title,
                            type: material.type
                          })}
                        >
                          {/* Clean Banner Header */}
                          <div className={cn("h-12 rounded-t-xl flex items-center justify-between px-3 py-2 text-white",
                            material.type === 'pdf' ? 'bg-red-500' : 
                            material.type === 'video' ? 'bg-blue-500' : 
                            material.type === 'audio' ? 'bg-purple-500' : 'bg-gray-500'
                          )}>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <IconComponent className="h-4 w-4 flex-shrink-0" />
                              <span className="text-xs font-bold tracking-wider">{material.type.toUpperCase()}</span>
                            </div>
                            
                            {/* Hover Actions in Banner */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAskAI({
                                    id: material.id,
                                    title: material.title,
                                    type: material.type
                                  });
                                }}
                                className="h-6 w-6 p-0 bg-white/20 hover:bg-white/30 text-white rounded"
                              >
                                <Sparkles className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMaterial(material.id);
                                }}
                                className="h-6 w-6 p-0 bg-white/20 hover:bg-red-400 text-white rounded"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Thumbnail Area - Show real preview or collapse */}
                          {material.type === 'pdf' ? (
                            <div className="flex-1 p-3 flex items-center justify-center bg-gray-50">
                              <PDFThumbnail 
                                materialId={material.id}
                                title={material.title}
                                className="w-20 h-16 rounded shadow-sm"
                              />
                            </div>
                          ) : (
                            /* Collapsed space for non-PDF files */
                            <div className="flex-1 min-h-[60px] bg-gray-50 flex items-center justify-center">
                              <IconComponent className={cn("h-12 w-12",
                                material.type === 'video' ? 'text-blue-400' : 
                                material.type === 'audio' ? 'text-purple-400' : 'text-gray-400'
                              )} />
                            </div>
                          )}
                          
                          {/* File Info Footer */}
                          <div className="p-3 border-t border-gray-100">
                            <h3 className="font-medium text-gray-900 mb-1 text-sm leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                              {material.title}
                            </h3>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap flex-1 mr-2">
                                {material.size}
                              </span>
                              <span className="text-gray-400 whitespace-nowrap">
                                {formatUploadTime(material.uploadedAt)}
                              </span>
                            </div>
                            {/* Module association - Always show module title */}
                            <div className="mt-1 text-xs text-gray-400">
                              <span className="inline-flex items-center gap-1">
                                <FolderOpen className="h-3 w-3" />
                                {module.title}
                              </span>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                    
                    {/* Upload tile at the end - matches card style */}
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-center bg-gray-50/50 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm transition-all duration-200 cursor-pointer min-h-[180px] group opacity-50 hover:opacity-100"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, module.id)}
                      onClick={() => handleFileSelect(module.id)}
                      style={{ minWidth: '220px' }} // Match card min-width
                    >
                      <div className="relative">
                        <Upload className="h-6 w-6 text-gray-400 mb-2 group-hover:text-gray-600 transition-colors" />
                        <div className="absolute inset-0 bg-[#7B61FF] rounded-full opacity-0 group-hover:opacity-10 blur-lg transition-opacity" />
                      </div>
                      <p className="text-sm font-medium text-gray-500 px-3 leading-tight group-hover:text-gray-600">
                        Add files
                      </p>
                      <p className="text-xs text-gray-400 mt-1 px-3 group-hover:text-gray-500">
                        Drag &amp; drop here
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Add Module Button - Smart positioning */}
      <div className={cn("mt-6", 
        modules.length === 0 ? "text-center" : "flex justify-start"
      )}>
        <Button
          onClick={handleCreateModule}
          variant="outline"
          size="sm"
          className={cn(
            "h-10 hover:bg-[#7B61FF] hover:text-white hover:border-[#7B61FF] transition-all duration-150",
            modules.length === 0 ? "bg-[#7B61FF] text-white border-[#7B61FF]" : ""
          )}
        >
          <Plus className="h-4 w-4 mr-1" />
          {modules.length === 0 ? "Create First Module" : "Add Module"}
        </Button>
      </div>

      {/* Hidden file input for file picker */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={Object.values(acceptedTypes).flat().join(',')}
        className="hidden"
      />
    </div>
  );
} 