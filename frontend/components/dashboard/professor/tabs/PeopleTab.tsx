import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Search, UserX, Users, Calendar } from "lucide-react";
import { Student } from '../hooks/useStudentManagement';

interface PeopleTabProps {
  students: Student[];
  loading: boolean;
  onRemoveStudent: (enrollmentId: string) => Promise<boolean>;
}

export function PeopleTab({ students, loading, onRemoveStudent }: PeopleTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmingDeleteStudentId, setConfirmingDeleteStudentId] = useState<string | null>(null);

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemoveStudent = async (enrollmentId: string) => {
    const success = await onRemoveStudent(enrollmentId);
    if (success) {
      setConfirmingDeleteStudentId(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* People Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Enrolled Students</span>
            <Badge variant="secondary">{students.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search students by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No students found' : 'No students enrolled'}
            </h3>
            <p className="text-gray-600">
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : 'Students will appear here once they join your course'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((student) => (
            <Card key={student.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage 
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.name}`} 
                        alt={student.name} 
                      />
                      <AvatarFallback>
                        {getInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h4 className="font-medium text-gray-900">{student.name}</h4>
                      <p className="text-sm text-gray-600">{student.email}</p>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        Enrolled {new Date(student.enrolledAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <AlertDialog
                    open={confirmingDeleteStudentId === student.enrollmentId}
                    onOpenChange={(open) => 
                      setConfirmingDeleteStudentId(open ? student.enrollmentId : null)
                    }
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Student</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove <strong>{student.name}</strong> from this course? 
                          This action cannot be undone and they will lose access to all course materials.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveStudent(student.enrollmentId)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Remove Student
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Instructions for adding students */}
      <Card className="border-dashed">
        <CardContent className="text-center py-6">
          <h4 className="font-medium text-gray-900 mb-2">Add Students to Your Course</h4>
          <p className="text-sm text-gray-600 mb-4">
            Share your course access code with students so they can enroll
          </p>
          <div className="inline-flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-md">
            <span className="text-sm font-medium">Access Code:</span>
            <code className="font-mono text-lg font-bold">
              {/* This would come from the course prop */}
              {/* {course.accessCode} */}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}