'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Upload, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BlankStateCTAProps {
  onImportClick?: () => void;
  onAddCourseClick?: () => void;
}

export function BlankStateCTA({ onImportClick, onAddCourseClick }: BlankStateCTAProps) {
  const router = useRouter();

  const handleImportClick = () => {
    if (onImportClick) {
      onImportClick();
    } else {
      // Navigate to courses page with import flag
      router.push('/courses?import=true');
    }
  };

  const handleAddCourseClick = () => {
    if (onAddCourseClick) {
      onAddCourseClick();
    } else {
      router.push('/courses');
    }
  };

  return (
    <Card className="border-2 border-blue-100 bg-gradient-to-r from-blue-50/30 to-white">
      <CardContent className="p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <BookOpen className="h-8 w-8 text-blue-600" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              No urgent work yet
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Import your courses to generate your first personalized study plan and start earning XP
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 justify-center pt-2 max-w-lg mx-auto">
            <Button
              size="lg"
              onClick={handleImportClick}
              className="bg-blue-600 hover:bg-blue-700 min-w-[200px]"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import from LMS
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleAddCourseClick}
              className="border-blue-300 text-blue-600 hover:bg-blue-50 min-w-[200px]"
            >
              Add Course Manually
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}