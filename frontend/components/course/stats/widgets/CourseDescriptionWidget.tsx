"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save, X } from "lucide-react";
import { toast as sonnerToast } from 'sonner';
import type { Course } from '../types';

interface CourseDescriptionWidgetProps {
  course: Course;
  onUpdateDescription: (description: string) => void;
}

export function CourseDescriptionWidget({ course, onUpdateDescription }: CourseDescriptionWidgetProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");

  const handleSaveDescription = () => {
    if (editedDescription.trim() !== course?.description) {
      onUpdateDescription(editedDescription.trim());
      sonnerToast.success("Course description updated");
    }
    setIsEditingDescription(false);
  };

  const handleCancelEdit = () => {
    setEditedDescription(course?.description || "");
    setIsEditingDescription(false);
  };

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-gray-600">About This Course</CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditedDescription(course.description || "");
              setIsEditingDescription(true);
            }}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isEditingDescription ? (
          <div className="space-y-3">
            <Textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              placeholder="Describe your course objectives, learning outcomes, and what makes it unique..."
              className="min-h-[100px] resize-none text-sm leading-relaxed"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveDescription} className="bg-[#7B61FF] hover:bg-[#6B51E5]">
                <Save className="h-3 w-3 mr-2" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                <X className="h-3 w-3 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="text-sm text-gray-700 leading-relaxed cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
            onClick={() => {
              setEditedDescription(course.description || "");
              setIsEditingDescription(true);
            }}
          >
            {course.description || "Click to add course description..."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}