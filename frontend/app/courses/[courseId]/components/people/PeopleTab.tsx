'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCourseColor } from '../../utils/courseHelpers';
import { Course } from '../../types/course.types';

interface PeopleTabProps {
  course: Course;
}

export default function PeopleTab({ course }: PeopleTabProps) {
  const colors = getCourseColor(course.id);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className={cn("w-2 h-8 rounded-full bg-gradient-to-b", colors.gradient)} />
        <h2 className="text-2xl font-semibold text-gray-900">Course People</h2>
      </div>
    
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Instructor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-lg">
                  {course.instructor?.charAt(0).toUpperCase() || 'I'}
                </span>
              </div>
              <div>
                <p className="font-medium">{course.instructor || 'Instructor'}</p>
                <p className="text-sm text-gray-500">Professor</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Classmates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center py-8 text-gray-500">
              Classmate list will be available soon
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}