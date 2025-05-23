"use client";

import type React from "react";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { instructorAPI, studentAPI } from "@/lib/api";
import { toast as sonnerToast } from 'sonner';

interface CourseFormProps {
  course?: {
    id: string;
    title: string;
    code: string;
    term: string;
    description: string;
    published: boolean;
  };
  onSave: (course: any) => void;
  onCancel: () => void;
  userRole?: 'instructor' | 'student';
}

export default function CourseForm({ course, onSave, onCancel, userRole = 'instructor' }: CourseFormProps) {
  const [formData, setFormData] = useState({
    title: course?.title || "",
    code: course?.code || "",
    term: course?.term || "Fall 2025",
    description: course?.description || "",
    published: course?.published || false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate course code from title
  useEffect(() => {
    if (!course && formData.title && !formData.code) {
      const generateCode = (title: string) => {
        const words = title.split(' ').filter(word => word.length > 2);
        if (words.length >= 2) {
          const prefix = words[0].substring(0, 2).toUpperCase();
          const number = Math.floor(Math.random() * 400) + 100;
          return `${prefix} ${number}`;
        }
        return '';
      };
      
      const autoCode = generateCode(formData.title);
      if (autoCode) {
        setFormData(prev => ({ ...prev, code: autoCode }));
      }
    }
  }, [formData.title, course, formData.code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      sonnerToast.error("Course title is required");
      return;
    }

    try {
      setIsSubmitting(true);
      
      let result;
      const api = userRole === 'student' ? studentAPI : instructorAPI;
      
      if (course?.id) {
        result = await api.updateCourse(course.id, formData);
        sonnerToast.success("Course updated successfully!");
      } else {
        result = await api.createCourse(formData);
        sonnerToast.success(`Course created successfully! ${result.accessCode ? `Access code: ${result.accessCode}` : ''}`);
      }
      
      onSave({
        id: result.id || course?.id,
        ...formData,
        accessCode: result.accessCode,
      });
      
    } catch (error) {
      console.error("Failed to save course:", error);
      sonnerToast.error("Failed to save course. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white">
      {/* Simple Header */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          {course ? "Edit Course" : "Create New Course"}
        </h2>
        <p className="text-sm text-gray-600">
          Define your course details below
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Course Info Section */}
        <div className="space-y-4">
          {/* Course Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium text-gray-700 mb-2 block">
              Course Title *
            </Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="e.g., Introduction to Machine Learning"
              className="w-full h-12 text-base border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          {/* Course Code + Term Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code" className="text-sm font-medium text-gray-700 mb-2 block">
                Course Code
              </Label>
              <Input
                id="code"
                type="text"
                value={formData.code}
                onChange={(e) => handleChange("code", e.target.value)}
                placeholder="CS 101"
                className="w-full h-12 text-base border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <Label htmlFor="term" className="text-sm font-medium text-gray-700 mb-2 block">
                Term
              </Label>
              <Select value={formData.term} onValueChange={(value) => handleChange("term", value)}>
                <SelectTrigger className="w-full h-12 text-base border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fall 2024">Fall 2024</SelectItem>
                  <SelectItem value="Spring 2025">Spring 2025</SelectItem>
                  <SelectItem value="Summer 2025">Summer 2025</SelectItem>
                  <SelectItem value="Fall 2025">Fall 2025</SelectItem>
                  <SelectItem value="Spring 2026">Spring 2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div>
          <Label htmlFor="description" className="text-sm font-medium text-gray-700 mb-2 block">
            Description
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Optional — Add learning goals, skills, outcomes, or what makes this course unique..."
            className="w-full min-h-[100px] text-base border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            rows={4}
          />
        </div>

        {/* Visibility Section */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Course Visibility
          </Label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleChange("published", false)}
              className={`flex-1 h-12 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                !formData.published
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              Draft
            </button>
            <button
              type="button"
              onClick={() => handleChange("published", true)}
              className={`flex-1 h-12 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                formData.published
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              Published
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {formData.published 
              ? "Course is visible to students and open for enrollment" 
              : "Course is private until you publish it"
            }
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 h-12 text-base border border-gray-300 text-gray-700 hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 h-12 text-base bg-blue-600 hover:bg-blue-700 text-white font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {course ? "Saving..." : "Creating..."}
              </>
            ) : (
              <>
                {course ? "Save Changes" : "Create Course"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
