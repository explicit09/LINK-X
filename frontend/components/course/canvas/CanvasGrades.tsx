'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, Award, Target, BarChart3, 
  Download, Filter, Calendar, CheckCircle, AlertTriangle
} from 'lucide-react';

interface GradeItem {
  id: string;
  name: string;
  category: 'assignment' | 'quiz' | 'exam' | 'participation' | 'project';
  points: number;
  maxPoints: number;
  percentage: number;
  submittedAt: string;
  gradedAt?: string;
  feedback?: string;
  late: boolean;
}

interface GradeCategory {
  name: string;
  weight: number;
  color: string;
  items: GradeItem[];
}

interface CanvasGradesProps {
  courseId: string;
  userRole: 'student' | 'instructor' | 'admin';
  className?: string;
}

export function CanvasGrades({ courseId, userRole, className }: CanvasGradesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const gradeCategories: GradeCategory[] = [
    {
      name: 'Assignments',
      weight: 40,
      color: 'blue',
      items: [
        {
          id: '1',
          name: 'Essay: Impact of AI on Education',
          category: 'assignment',
          points: 85,
          maxPoints: 100,
          percentage: 85,
          submittedAt: '2024-12-09T15:30:00',
          gradedAt: '2024-12-11T10:00:00',
          feedback: 'Excellent analysis and well-structured arguments. Consider adding more recent examples.',
          late: false,
        },
        {
          id: '2',
          name: 'Research Paper Draft',
          category: 'assignment',
          points: 78,
          maxPoints: 100,
          percentage: 78,
          submittedAt: '2024-12-05T23:59:00',
          gradedAt: '2024-12-07T14:20:00',
          feedback: 'Good start, but needs more citations and deeper analysis.',
          late: false,
        },
      ],
    },
    {
      name: 'Quizzes',
      weight: 30,
      color: 'green',
      items: [
        {
          id: '3',
          name: 'Quiz: Machine Learning Basics',
          category: 'quiz',
          points: 45,
          maxPoints: 50,
          percentage: 90,
          submittedAt: '2024-12-09T16:30:00',
          gradedAt: '2024-12-09T16:31:00',
          late: false,
        },
        {
          id: '4',
          name: 'Quiz: Neural Networks',
          category: 'quiz',
          points: 42,
          maxPoints: 50,
          percentage: 84,
          submittedAt: '2024-12-02T17:00:00',
          gradedAt: '2024-12-02T17:01:00',
          late: false,
        },
      ],
    },
    {
      name: 'Exams',
      weight: 25,
      color: 'purple',
      items: [
        {
          id: '5',
          name: 'Midterm Exam',
          category: 'exam',
          points: 165,
          maxPoints: 200,
          percentage: 82.5,
          submittedAt: '2024-11-15T14:00:00',
          gradedAt: '2024-11-18T09:00:00',
          feedback: 'Strong performance overall. Review the material on unsupervised learning.',
          late: false,
        },
      ],
    },
    {
      name: 'Participation',
      weight: 5,
      color: 'orange',
      items: [
        {
          id: '6',
          name: 'Class Participation',
          category: 'participation',
          points: 95,
          maxPoints: 100,
          percentage: 95,
          submittedAt: '2024-12-01T00:00:00',
          gradedAt: '2024-12-01T00:00:00',
          feedback: 'Excellent participation and thoughtful contributions to discussions.',
          late: false,
        },
      ],
    },
  ];

  // Calculate overall grade
  const calculateOverallGrade = () => {
    let totalWeightedPoints = 0;
    let totalWeight = 0;

    gradeCategories.forEach(category => {
      if (category.items.length > 0) {
        const categoryAverage = category.items.reduce((sum, item) => sum + item.percentage, 0) / category.items.length;
        totalWeightedPoints += categoryAverage * (category.weight / 100);
        totalWeight += category.weight;
      }
    });

    return totalWeight > 0 ? totalWeightedPoints : 0;
  };

  const overallGrade = calculateOverallGrade();
  const letterGrade = overallGrade >= 90 ? 'A' : overallGrade >= 80 ? 'B' : overallGrade >= 70 ? 'C' : overallGrade >= 60 ? 'D' : 'F';

  const getAllGradeItems = () => {
    return gradeCategories.flatMap(category => 
      category.items.map(item => ({
        ...item,
        categoryName: category.name,
        categoryColor: category.color,
      }))
    ).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getCategoryColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Grades</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overall Grade Card */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Overall Course Grade</h3>
              <p className="text-gray-600">Based on completed assignments and weighted categories</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-blue-600">{overallGrade.toFixed(1)}%</div>
              <div className="text-2xl font-semibold text-blue-800">{letterGrade}</div>
            </div>
          </div>
          <Progress value={overallGrade} className="mt-4 h-3" />
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {gradeCategories.map((category) => {
          const categoryAverage = category.items.length > 0 
            ? category.items.reduce((sum, item) => sum + item.percentage, 0) / category.items.length 
            : 0;
          
          return (
            <Card key={category.name} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={cn("px-2 py-1 rounded-full text-xs font-medium border", getCategoryColor(category.color))}>
                    {category.name}
                  </span>
                  <span className="text-xs text-gray-500">{category.weight}% weight</span>
                </div>
                
                <div className="text-center">
                  <div className={cn("text-2xl font-bold mb-1", getGradeColor(categoryAverage))}>
                    {categoryAverage.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {category.items.length} items
                  </div>
                  <Progress value={categoryAverage} className="h-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Grade Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Grade History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getAllGradeItems().map((item, index) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <span className={cn("px-2 py-1 rounded-full text-xs font-medium border", getCategoryColor(item.categoryColor))}>
                      {item.categoryName}
                    </span>
                    {item.late && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Late
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Submitted: {new Date(item.submittedAt).toLocaleDateString()}</span>
                    {item.gradedAt && (
                      <span>Graded: {new Date(item.gradedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  
                  {item.feedback && (
                    <p className="text-sm text-gray-700 mt-2 italic">"{item.feedback}"</p>
                  )}
                </div>
                
                <div className="text-right ml-4">
                  <div className={cn("text-xl font-bold", getGradeColor(item.percentage))}>
                    {item.points}/{item.maxPoints}
                  </div>
                  <div className={cn("text-sm font-medium", getGradeColor(item.percentage))}>
                    {item.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grade Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {getAllGradeItems().filter(item => item.percentage >= 90).length}
            </div>
            <div className="text-sm text-gray-600">A Grades</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-8 h-8 mx-auto text-blue-600 mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {getAllGradeItems().filter(item => item.percentage >= 80).length}
            </div>
            <div className="text-sm text-gray-600">B+ or Higher</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-8 h-8 mx-auto text-green-600 mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {getAllGradeItems().length}
            </div>
            <div className="text-sm text-gray-600">Total Submissions</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}