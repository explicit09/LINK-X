import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users, BookOpen, Clock } from "lucide-react";
import { Course } from '../hooks/useCourses';

interface HomeTabProps {
  course: Course;
  studentCount: number;
  moduleCount: number;
}

export function HomeTab({ course, studentCount, moduleCount }: HomeTabProps) {
  return (
    <div className="space-y-6">
      {/* Course Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students Enrolled</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentCount}</div>
            <p className="text-xs text-muted-foreground">
              Active enrollments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modules</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{moduleCount}</div>
            <p className="text-xs text-muted-foreground">
              Course modules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant={course.published ? "default" : "secondary"}>
                {course.published ? "Published" : "Draft"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Course visibility
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Course Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>Course Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Course Title</label>
              <p className="text-lg font-semibold">{course.title}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Course Code</label>
              <p className="text-lg font-semibold">{course.code}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Term</label>
              <p className="text-lg font-semibold">{course.term}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Access Code</label>
              <p className="text-lg font-semibold font-mono bg-gray-100 px-2 py-1 rounded">
                {course.accessCode}
              </p>
            </div>
          </div>

          {course.description && (
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <p className="text-gray-600 mt-1">{course.description}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700">Last Updated</label>
            <p className="text-gray-600 flex items-center mt-1">
              <CalendarDays className="h-4 w-4 mr-2" />
              {new Date(course.lastUpdated).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <h4 className="font-medium">Share Access Code</h4>
              <p className="text-gray-600">Students can join using: <span className="font-mono">{course.accessCode}</span></p>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <h4 className="font-medium">Course Analytics</h4>
              <p className="text-gray-600">View student engagement and progress</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}