'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, Calendar, Clock, CheckCircle, AlertCircle, 
  FileText, Upload, Download, Edit, Trash2, Users
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  points: number;
  submissionType: 'file' | 'text' | 'url' | 'quiz';
  status: 'not_submitted' | 'submitted' | 'graded' | 'late';
  submittedAt?: string;
  grade?: number;
  feedback?: string;
  allowLateSubmission: boolean;
  groupAssignment: boolean;
  published: boolean;
}

interface CanvasAssignmentsProps {
  courseId: string;
  isOwner: boolean;
  userRole: 'student' | 'instructor' | 'admin';
  className?: string;
}

export function CanvasAssignments({ courseId, isOwner, userRole, className }: CanvasAssignmentsProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([
    {
      id: '1',
      title: 'Essay: Impact of AI on Education',
      description: 'Write a 1500-word essay analyzing the impact of artificial intelligence on modern education.',
      dueDate: '2024-12-15T23:59:00',
      points: 100,
      submissionType: 'file',
      status: 'not_submitted',
      allowLateSubmission: true,
      groupAssignment: false,
      published: true,
    },
    {
      id: '2',
      title: 'Quiz: Machine Learning Basics',
      description: 'Complete the online quiz covering chapters 1-3.',
      dueDate: '2024-12-10T17:00:00',
      points: 50,
      submissionType: 'quiz',
      status: 'graded',
      submittedAt: '2024-12-09T16:30:00',
      grade: 45,
      allowLateSubmission: false,
      groupAssignment: false,
      published: true,
    },
    {
      id: '3',
      title: 'Group Project: AI Ethics Case Study',
      description: 'Work in teams of 4 to analyze an ethical dilemma in AI development.',
      dueDate: '2024-12-20T23:59:00',
      points: 150,
      submissionType: 'file',
      status: 'submitted',
      submittedAt: '2024-12-18T20:15:00',
      allowLateSubmission: true,
      groupAssignment: true,
      published: true,
    },
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const getStatusColor = (status: Assignment['status']) => {
    switch (status) {
      case 'not_submitted': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'submitted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'graded': return 'bg-green-100 text-green-800 border-green-200';
      case 'late': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: Assignment['status']) => {
    switch (status) {
      case 'not_submitted': return <Clock className="w-4 h-4" />;
      case 'submitted': return <Upload className="w-4 h-4" />;
      case 'graded': return <CheckCircle className="w-4 h-4" />;
      case 'late': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const isOverdue = (dueDate: string, status: Assignment['status']) => {
    if (status === 'graded' || status === 'submitted') return false;
    return new Date() > new Date(dueDate);
  };

  const getSubmissionTypeIcon = (type: Assignment['submissionType']) => {
    switch (type) {
      case 'file': return <FileText className="w-4 h-4" />;
      case 'text': return <Edit className="w-4 h-4" />;
      case 'url': return <Download className="w-4 h-4" />;
      case 'quiz': return <CheckCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Calculate assignment statistics
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(a => a.status === 'graded' || a.status === 'submitted').length;
  const totalPoints = assignments.reduce((sum, a) => sum + a.points, 0);
  const earnedPoints = assignments.filter(a => a.grade !== undefined).reduce((sum, a) => sum + (a.grade || 0), 0);

  if (assignments.length === 0) {
    return (
      <div className={cn("space-y-6", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Assignments</h2>
          {isOwner && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Assignment
            </Button>
          )}
        </div>

        {/* Empty State */}
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isOwner ? 'No Assignments Created' : 'No Assignments Available'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md">
              {isOwner 
                ? 'Create your first assignment to help students learn and practice course concepts.'
                : 'No assignments have been posted yet. Check back later for new assignments.'}
            </p>
            {isOwner && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Assignment
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Assignments</h2>
        {isOwner && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Assignment
          </Button>
        )}
      </div>

      {/* Assignment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total Assignments</span>
              <span className="text-2xl font-bold text-gray-900">{totalAssignments}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Completed</span>
              <span className="text-2xl font-bold text-gray-900">{completedAssignments}/{totalAssignments}</span>
            </div>
            <Progress value={(completedAssignments / totalAssignments) * 100} className="h-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total Points</span>
              <span className="text-2xl font-bold text-gray-900">{totalPoints}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Points Earned</span>
              <span className="text-2xl font-bold text-gray-900">{earnedPoints}/{totalPoints}</span>
            </div>
            <Progress value={(earnedPoints / totalPoints) * 100} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Assignment List */}
      <div className="space-y-4">
        {assignments.map((assignment) => {
          const overdue = isOverdue(assignment.dueDate, assignment.status);
          
          return (
            <Card 
              key={assignment.id} 
              className={cn(
                "hover:shadow-md transition-shadow cursor-pointer",
                overdue && "border-red-200 bg-red-50"
              )}
              onClick={() => setSelectedAssignment(assignment)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border", getStatusColor(assignment.status))}>
                        {getStatusIcon(assignment.status)}
                        <span>{assignment.status.replace('_', ' ').toUpperCase()}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-gray-600">
                        {getSubmissionTypeIcon(assignment.submissionType)}
                        <span className="text-xs uppercase">{assignment.submissionType}</span>
                      </div>
                      
                      {assignment.groupAssignment && (
                        <div className="flex items-center gap-1 text-purple-600">
                          <Users className="w-4 h-4" />
                          <span className="text-xs">GROUP</span>
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {assignment.title}
                    </h3>
                    
                    {assignment.description && (
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {assignment.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span className={overdue ? "text-red-600 font-medium" : ""}>
                          Due {format(new Date(assignment.dueDate), 'MMM d, yyyy')} at {format(new Date(assignment.dueDate), 'h:mm a')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{assignment.points} points</span>
                      </div>
                      
                      {assignment.submittedAt && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>Submitted {formatDistanceToNow(new Date(assignment.submittedAt), { addSuffix: true })}</span>
                        </div>
                      )}
                    </div>
                    
                    {assignment.grade !== undefined && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-900">Grade</span>
                          <span className="text-lg font-bold text-green-900">
                            {assignment.grade}/{assignment.points} ({Math.round((assignment.grade / assignment.points) * 100)}%)
                          </span>
                        </div>
                        {assignment.feedback && (
                          <p className="text-sm text-green-800 mt-2">{assignment.feedback}</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {isOwner && (
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}