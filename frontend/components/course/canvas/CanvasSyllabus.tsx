'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, Edit, Calendar, Clock, MapPin, Mail, Phone,
  BookOpen, Target, Award, AlertTriangle, ExternalLink,
  FileText, Users, Lightbulb, CheckCircle
} from 'lucide-react';

interface CourseScheduleItem {
  id: string;
  week: number;
  date: string;
  topic: string;
  readings?: string[];
  assignments?: string[];
  dueDate?: string;
}

interface CanvasSyllabusProps {
  courseId: string;
  isOwner: boolean;
  userRole: 'student' | 'instructor' | 'admin';
  className?: string;
}

export function CanvasSyllabus({ courseId, isOwner, userRole, className }: CanvasSyllabusProps) {
  const [activeSection, setActiveSection] = useState<string>('overview');

  const courseInfo = {
    title: 'Introduction to Artificial Intelligence',
    code: 'CS 485',
    credits: 3,
    semester: 'Fall 2024',
    meetingTime: 'MWF 10:00-10:50 AM',
    location: 'Engineering Building, Room 205',
    instructor: {
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@university.edu',
      phone: '(555) 123-4567',
      officeHours: 'Tuesday & Thursday 2:00-4:00 PM',
      officeLocation: 'Engineering Building, Room 315',
    },
    ta: {
      name: 'Alex Chen',
      email: 'alex.chen@university.edu',
      officeHours: 'Monday 1:00-3:00 PM',
      officeLocation: 'Engineering Building, Room 210',
    },
  };

  const courseDescription = `This course provides an introduction to the fundamental concepts and techniques of artificial intelligence. Students will learn about problem-solving, knowledge representation, machine learning, and AI applications. The course combines theoretical foundations with practical programming assignments using Python and modern AI frameworks.`;

  const learningObjectives = [
    'Understand the fundamental concepts and history of artificial intelligence',
    'Apply search algorithms and optimization techniques to solve problems',
    'Implement machine learning algorithms for classification and prediction',
    'Design and evaluate knowledge representation systems',
    'Analyze ethical implications of AI systems in society',
    'Develop practical AI applications using modern tools and frameworks',
  ];

  const gradingBreakdown = [
    { category: 'Assignments (4)', percentage: 40, points: 400 },
    { category: 'Quizzes (6)', percentage: 20, points: 200 },
    { category: 'Midterm Exam', percentage: 15, points: 150 },
    { category: 'Final Project', percentage: 20, points: 200 },
    { category: 'Participation', percentage: 5, points: 50 },
  ];

  const courseSchedule: CourseScheduleItem[] = [
    {
      id: '1',
      week: 1,
      date: 'Aug 28 - Sep 1',
      topic: 'Introduction to AI: History, Applications, and Ethics',
      readings: ['Chapter 1: Introduction', 'AI Ethics Paper'],
    },
    {
      id: '2',
      week: 2,
      date: 'Sep 4 - Sep 8',
      topic: 'Problem Solving and Search Algorithms',
      readings: ['Chapter 2: Problem Solving', 'Chapter 3: Search'],
      assignments: ['Assignment 1: Search Algorithms'],
      dueDate: 'Sep 15',
    },
    {
      id: '3',
      week: 3,
      date: 'Sep 11 - Sep 15',
      topic: 'Informed Search and Heuristics',
      readings: ['Chapter 4: Informed Search'],
    },
    {
      id: '4',
      week: 4,
      date: 'Sep 18 - Sep 22',
      topic: 'Game Playing and Adversarial Search',
      readings: ['Chapter 5: Games'],
      assignments: ['Assignment 2: Game Playing AI'],
      dueDate: 'Sep 29',
    },
    {
      id: '5',
      week: 5,
      date: 'Sep 25 - Sep 29',
      topic: 'Knowledge Representation and Logic',
      readings: ['Chapter 6: Logic', 'Chapter 7: Knowledge Representation'],
    },
    {
      id: '6',
      week: 6,
      date: 'Oct 2 - Oct 6',
      topic: 'Machine Learning Fundamentals',
      readings: ['Chapter 8: ML Introduction'],
    },
    {
      id: '7',
      week: 7,
      date: 'Oct 9 - Oct 13',
      topic: 'Supervised Learning and Neural Networks',
      readings: ['Chapter 9: Neural Networks'],
      assignments: ['Assignment 3: Neural Network Implementation'],
      dueDate: 'Oct 20',
    },
    {
      id: '8',
      week: 8,
      date: 'Oct 16 - Oct 20',
      topic: 'Midterm Exam Week',
    },
  ];

  const coursePolicies = {
    attendance: 'Regular attendance is expected. More than 3 unexcused absences may result in a lower course grade.',
    lateWork: 'Late assignments will be penalized 10% per day. No submissions accepted after 5 days.',
    makeupExams: 'Makeup exams only allowed for documented emergencies or illness.',
    academicIntegrity: 'All work must be your own. Collaboration on assignments is encouraged but copying is prohibited.',
    accommodations: 'Students with documented disabilities should contact the Office of Disability Services.',
  };

  const requiredMaterials = [
    {
      type: 'Textbook',
      title: 'Artificial Intelligence: A Modern Approach (4th Edition)',
      authors: 'Stuart Russell and Peter Norvig',
      isbn: '978-0134610993',
      required: true,
    },
    {
      type: 'Software',
      title: 'Python 3.8+',
      description: 'Free programming language with AI/ML libraries',
      required: true,
    },
    {
      type: 'Platform',
      title: 'Jupyter Notebooks',
      description: 'For interactive programming assignments',
      required: true,
    },
  ];

  const sections = [
    { id: 'overview', title: 'Course Overview', icon: BookOpen },
    { id: 'schedule', title: 'Schedule', icon: Calendar },
    { id: 'grading', title: 'Grading', icon: Award },
    { id: 'policies', title: 'Policies', icon: AlertTriangle },
    { id: 'materials', title: 'Materials', icon: FileText },
    { id: 'contact', title: 'Contact Info', icon: Mail },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Course Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{courseDescription}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Learning Objectives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {learningObjectives.map((objective, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">{objective}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'schedule':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Course Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courseSchedule.map((item) => (
                  <div key={item.id} className="border-l-4 border-blue-400 pl-4 py-3 bg-blue-50 rounded-r-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="secondary">Week {item.week}</Badge>
                          <span className="text-sm text-gray-600">{item.date}</span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-2">{item.topic}</h4>
                        
                        {item.readings && (
                          <div className="mb-2">
                            <span className="text-sm font-medium text-gray-700">Readings:</span>
                            <ul className="list-disc list-inside text-sm text-gray-600 ml-2">
                              {item.readings.map((reading, idx) => (
                                <li key={idx}>{reading}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {item.assignments && (
                          <div className="mb-2">
                            <span className="text-sm font-medium text-gray-700">Assignments:</span>
                            <ul className="list-disc list-inside text-sm text-gray-600 ml-2">
                              {item.assignments.map((assignment, idx) => (
                                <li key={idx} className="text-blue-600">{assignment}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      {item.dueDate && (
                        <Badge variant="destructive" className="ml-4">
                          Due {item.dueDate}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'grading':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Grading Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {gradingBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.category}</h4>
                        <p className="text-sm text-gray-600">{item.points} points</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{item.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Grading Scale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { grade: 'A', range: '90-100%', color: 'bg-green-100 text-green-800' },
                    { grade: 'B', range: '80-89%', color: 'bg-blue-100 text-blue-800' },
                    { grade: 'C', range: '70-79%', color: 'bg-yellow-100 text-yellow-800' },
                    { grade: 'D', range: '60-69%', color: 'bg-orange-100 text-orange-800' },
                    { grade: 'F', range: 'Below 60%', color: 'bg-red-100 text-red-800' },
                  ].map((item) => (
                    <div key={item.grade} className={cn("p-3 rounded-lg text-center", item.color)}>
                      <div className="text-2xl font-bold">{item.grade}</div>
                      <div className="text-sm">{item.range}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'policies':
        return (
          <div className="space-y-4">
            {Object.entries(coursePolicies).map(([key, value]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="capitalize text-lg">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'materials':
        return (
          <div className="space-y-4">
            {requiredMaterials.map((material, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={material.required ? 'destructive' : 'secondary'}>
                          {material.required ? 'Required' : 'Optional'}
                        </Badge>
                        <span className="text-sm text-gray-600">{material.type}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{material.title}</h3>
                      {'authors' in material && (
                        <p className="text-gray-600 mb-1">by {material.authors}</p>
                      )}
                      {'description' in material && (
                        <p className="text-gray-600 mb-1">{material.description}</p>
                      )}
                      {'isbn' in material && (
                        <p className="text-sm text-gray-500">ISBN: {material.isbn}</p>
                      )}
                    </div>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Instructor Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{courseInfo.instructor.name}</h3>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        <a href={`mailto:${courseInfo.instructor.email}`} className="text-blue-600 hover:underline">
                          {courseInfo.instructor.email}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{courseInfo.instructor.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>Office Hours: {courseInfo.instructor.officeHours}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{courseInfo.instructor.officeLocation}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Teaching Assistant</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <h3 className="font-semibold text-gray-900">{courseInfo.ta.name}</h3>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <a href={`mailto:${courseInfo.ta.email}`} className="text-blue-600 hover:underline">
                        {courseInfo.ta.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Office Hours: {courseInfo.ta.officeHours}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{courseInfo.ta.officeLocation}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Syllabus</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          {isOwner && (
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Syllabus
            </Button>
          )}
        </div>
      </div>

      {/* Course Info Header */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{courseInfo.title}</h1>
              <p className="text-lg text-gray-700 mb-3">{courseInfo.code} • {courseInfo.credits} Credits</p>
              <p className="text-gray-600">{courseInfo.semester}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{courseInfo.meetingTime}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{courseInfo.location}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4" />
                <span>{courseInfo.instructor.name}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-2 flex-wrap">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Button
              key={section.id}
              variant={activeSection === section.id ? 'default' : 'outline'}
              onClick={() => setActiveSection(section.id)}
              className="flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              {section.title}
            </Button>
          );
        })}
      </div>

      {/* Content */}
      {renderSection()}
    </div>
  );
}