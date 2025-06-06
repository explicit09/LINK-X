'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, Calendar, Settings, Eye, EyeOff, 
  Loader2, CheckCircle, AlertCircle, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { moduleAPI } from '@/lib/api/endpoints/modules';

interface ModuleFormProps {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModuleForm({ courseId, isOpen, onClose, onSuccess }: ModuleFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [published, setPublished] = useState(false);
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableUntil, setAvailableUntil] = useState('');
  const [prerequisites, setPrerequisites] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPublished(false);
    setAvailableFrom('');
    setAvailableUntil('');
    setPrerequisites('');
    setCurrentStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Module title is required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await moduleAPI.createModule(courseId, {
        title: title.trim(),
        description: description.trim(),
        published,
        available_from: availableFrom || null,
        available_until: availableUntil || null,
        prerequisites: prerequisites.trim() || null,
      });
      
      toast.success(`Module "${title}" created successfully!`);
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create module:', error);
      toast.error('Failed to create module. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">Create New Module</DialogTitle>
                <DialogDescription className="text-gray-600">
                  Organize your course content into structured learning modules
                </DialogDescription>
              </div>
            </div>
            
            {/* Progress Steps */}
            <div className="flex items-center gap-2 pt-2">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                currentStep >= 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}>
                <CheckCircle className="w-4 h-4" />
                Basic Info
              </div>
              <div className="w-8 h-px bg-gray-300"></div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                currentStep >= 2 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}>
                <Settings className="w-4 h-4" />
                Settings
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-6 py-6">
            {/* Step 1: Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="w-5 h-5" />
                  Module Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">
                    Module Title *
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Introduction to Machine Learning"
                    disabled={isSubmitting}
                    required
                    className="text-base"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what students will learn in this module..."
                    rows={3}
                    disabled={isSubmitting}
                    className="text-base resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    This description will help students understand the module's learning objectives.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prerequisites" className="text-sm font-medium">
                    Prerequisites
                  </Label>
                  <Input
                    id="prerequisites"
                    value={prerequisites}
                    onChange={(e) => setPrerequisites(e.target.value)}
                    placeholder="e.g., Basic programming knowledge, completed Module 1"
                    disabled={isSubmitting}
                    className="text-base"
                  />
                  <p className="text-xs text-gray-500">
                    List any knowledge or modules students should complete first.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Availability Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5" />
                  Availability & Publishing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {published ? (
                      <Eye className="w-5 h-5 text-green-600" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-gray-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {published ? 'Published' : 'Draft'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {published 
                          ? 'Students can see and access this module'
                          : 'Only you can see this module until published'
                        }
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={published}
                    onCheckedChange={setPublished}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="availableFrom" className="text-sm font-medium">
                      Available From
                    </Label>
                    <Input
                      id="availableFrom"
                      type="datetime-local"
                      value={availableFrom}
                      onChange={(e) => setAvailableFrom(e.target.value)}
                      disabled={isSubmitting}
                      className="text-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="availableUntil" className="text-sm font-medium">
                      Available Until
                    </Label>
                    <Input
                      id="availableUntil"
                      type="datetime-local"
                      value={availableUntil}
                      onChange={(e) => setAvailableUntil(e.target.value)}
                      disabled={isSubmitting}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Publishing Tips:</p>
                    <ul className="mt-1 text-xs space-y-1">
                      <li>• Keep modules as drafts while adding content</li>
                      <li>• Set availability dates for timed releases</li>
                      <li>• Students receive notifications when modules are published</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <DialogFooter className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !title.trim()}
              className="flex items-center gap-2 min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Create Module
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}