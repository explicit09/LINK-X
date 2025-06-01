import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/alert-dialog';
import {
  Settings,
  Save,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Course } from '../hooks/useCourses';

interface SettingsTabProps {
  course: Course;
  onUpdateCourse: (courseId: string, updateData: any) => Promise<Course | null>;
  onDeleteCourse: (courseId: string) => Promise<boolean>;
  onTogglePublish: (courseId: string) => Promise<boolean>;
  onBackToDashboard: () => void;
}

export function SettingsTab({
  course,
  onUpdateCourse,
  onDeleteCourse,
  onTogglePublish,
  onBackToDashboard,
}: SettingsTabProps) {
  const [editedCourse, setEditedCourse] = useState<Course>(course);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [accessCodeCopied, setAccessCodeCopied] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);

    const updateData = {
      title: editedCourse.title,
      description: editedCourse.description,
      code: editedCourse.code,
      term: editedCourse.term,
    };

    const updated = await onUpdateCourse(course.id, updateData);

    if (updated) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }

    setIsSaving(false);
  };

  const handleTogglePublish = async () => {
    const success = await onTogglePublish(course.id);
    if (success) {
      setEditedCourse((prev) => ({ ...prev, published: !prev.published }));
    }
  };

  const handleDeleteCourse = async () => {
    const success = await onDeleteCourse(course.id);
    if (success) {
      onBackToDashboard();
    }
    setConfirmingDelete(false);
  };

  const copyAccessCode = async () => {
    try {
      await navigator.clipboard.writeText(course.accessCode);
      setAccessCodeCopied(true);
      setTimeout(() => setAccessCodeCopied(false), 2000);
      toast.success('Access code copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy access code');
    }
  };

  const hasChanges = JSON.stringify(editedCourse) !== JSON.stringify(course);

  return (
    <div className="space-y-6">
      {/* Course Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Course Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title</Label>
              <Input
                id="title"
                value={editedCourse.title}
                onChange={(e) =>
                  setEditedCourse((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="Enter course title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Course Code</Label>
              <Input
                id="code"
                value={editedCourse.code}
                onChange={(e) =>
                  setEditedCourse((prev) => ({ ...prev, code: e.target.value }))
                }
                placeholder="e.g. CS101"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="term">Term</Label>
              <Input
                id="term"
                value={editedCourse.term}
                onChange={(e) =>
                  setEditedCourse((prev) => ({ ...prev, term: e.target.value }))
                }
                placeholder="e.g. Fall 2024"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessCode">Access Code</Label>
              <div className="flex space-x-2">
                <Input
                  id="accessCode"
                  value={course.accessCode}
                  readOnly
                  className="font-mono bg-gray-50"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAccessCode}
                  className="flex items-center space-x-1"
                >
                  {accessCodeCopied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-600">
                Students use this code to join your course
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={editedCourse.description || ''}
              onChange={(e) =>
                setEditedCourse((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Enter course description"
              rows={3}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex items-center space-x-2"
            >
              {saveSuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Publishing */}
      <Card>
        <CardHeader>
          <CardTitle>Course Visibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium">Publish Course</h4>
                <Badge
                  variant={editedCourse.published ? 'default' : 'secondary'}
                >
                  {editedCourse.published ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                {editedCourse.published
                  ? 'Students can access this course and its materials'
                  : 'Course is hidden from students until published'}
              </p>
            </div>
            <Switch
              checked={editedCourse.published}
              onCheckedChange={handleTogglePublish}
            />
          </div>

          {editedCourse.published && (
            <div className="flex items-start space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Eye className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Course is live
                </p>
                <p className="text-sm text-green-700">
                  Students can now access this course using the access code:
                  <span className="font-mono ml-1">{course.accessCode}</span>
                </p>
              </div>
            </div>
          )}

          {!editedCourse.published && (
            <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <EyeOff className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Course is in draft mode
                </p>
                <p className="text-sm text-yellow-700">
                  Students cannot access this course until you publish it
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Danger Zone</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border border-red-200 rounded-lg bg-red-50">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-red-800">Delete Course</h4>
                <p className="text-sm text-red-700 mt-1">
                  Permanently delete this course and all its content. This
                  action cannot be undone.
                </p>
              </div>

              <AlertDialog
                open={confirmingDelete}
                onOpenChange={setConfirmingDelete}
              >
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="ml-4">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Course
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Course</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "
                      <strong>{course.title}</strong>"? This will permanently
                      delete:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>All course materials and modules</li>
                        <li>All student enrollments</li>
                        <li>All course data and analytics</li>
                      </ul>
                      <br />
                      <strong>This action cannot be undone.</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteCourse}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete Course
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
