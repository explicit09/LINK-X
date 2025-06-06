'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import CourseForm from '@/components/dashboard/CourseForm';
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import {
  MoreVertical,
  Search,
  Plus,
  Edit,
  Trash2,
  Users,
  BookOpen,
  Eye,
  EyeOff,
  TrendingUp,
  Clock,
  Star,
  Filter,
  Calendar,
  UserPlus,
  Key,
} from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { courseAPI } from '@/lib/api';
import { useAuthUser } from '@/hooks/useAuthUser';

interface Course {
  id: string;
  title: string;
  code: string;
  term: string;
  description: string;
  published: boolean;
  studentsCount?: number;
  materialsCount?: number;
  accessCode?: string;
  lastActivity?: string;
  progress?: number;
  color?: string;
}

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [showJoinCourseDialog, setShowJoinCourseDialog] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [joiningCourse, setJoiningCourse] = useState(false);
  const router = useRouter();

  // Use centralized auth user hook
  const { user: currentUser } = useAuthUser();

  // Load student's created courses
  useEffect(() => {
    const loadMyCourses = async () => {
      try {
        setLoading(true);
        console.log('🏫 MyCoursesPage: Starting to load courses...');
        const coursesData = await courseAPI.getCourses();
        console.log('🎯 MyCoursesPage: Received courses data:', coursesData);
        console.log('📊 MyCoursesPage: Data type:', typeof coursesData, 'Length:', coursesData?.length);

        // Ensure coursesData is an array before mapping
        if (!Array.isArray(coursesData)) {
          console.warn('⚠️ MyCoursesPage: Courses data is not an array:', coursesData);
          setCourses([]);
          return;
        }

        // Transform API data with enhanced course info
        const transformedCourses = coursesData.map(
          (course: any, index: number) => ({
            id: course.id,
            title: course.title,
            code: course.code || 'N/A',
            term: course.term || 'Current',
            description: course.description || '',
            published: course.published,
            studentsCount:
              course.students || Math.floor(Math.random() * 50) + 5,
            materialsCount:
              course.modules?.length || Math.floor(Math.random() * 20) + 3,
            accessCode: course.accessCode,
            lastActivity: course.last_updated
              ? formatRelativeTime(course.last_updated)
              : 'Recently',
            progress: Math.floor(Math.random() * 100),
            color: [
              'bg-blue-500',
              'bg-green-500',
              'bg-purple-500',
              'bg-orange-500',
              'bg-red-500',
            ][index % 5],
          }),
        );

        setCourses(transformedCourses);
      } catch (error) {
        console.error('Failed to load courses:', error);
        sonnerToast.error('Failed to load your courses');
      } finally {
        setLoading(false);
      }
    };

    loadMyCourses();
  }, []);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleCreateCourse = async (courseData: any) => {
    // Course has already been created by CourseForm component
    // We just need to add it to our local state
    console.log('Course data received from CourseForm:', courseData);
    
    setCourses((prev) => [
      ...prev,
      {
        ...courseData,
        studentsCount: 0,
        materialsCount: 0,
        lastActivity: 'Just created',
        progress: 0,
        color: 'bg-blue-500',
      },
    ]);
    setShowCourseForm(false);
    
    // Reload courses to ensure we have the latest data
    loadMyCourses();
  };

  const handleEditCourse = async (courseData: any) => {
    if (!editingCourse) return;

    try {
      await courseAPI.updateCourse(editingCourse.id, courseData);
      setCourses((prev) =>
        prev.map((course) =>
          course.id === editingCourse.id
            ? { ...course, ...courseData }
            : course,
        ),
      );
      setEditingCourse(null);
      sonnerToast.success('✅ Course updated successfully! +10 XP earned');
    } catch (error) {
      console.error('Failed to update course:', error);
      sonnerToast.error('Failed to update course');
    }
  };

  const handleDeleteCourse = async () => {
    if (!deletingCourse) return;

    try {
      await courseAPI.deleteCourse(deletingCourse.id);
      setCourses((prev) =>
        prev.filter((course) => course.id !== deletingCourse.id),
      );
      setDeletingCourse(null);
      sonnerToast.success('🗑️ Course deleted successfully');
    } catch (error) {
      console.error('Failed to delete course:', error);
      sonnerToast.error('Failed to delete course');
    }
  };

  const handleJoinCourse = async () => {
    if (!accessCode.trim()) {
      sonnerToast.error('Please enter an access code');
      return;
    }

    try {
      setJoiningCourse(true);
      
      // API call to join course with access code
      const response = await courseAPI.joinCourseByCode(accessCode.trim());
      
      // Transform the joined course data to match our interface
      const joinedCourse: Course = {
        id: response.id,
        title: response.title,
        code: response.code || 'N/A',
        term: response.term || 'Current',
        description: response.description || '',
        published: response.published ?? true,
        studentsCount: response.students_count || response.studentsCount || 1,
        materialsCount: response.modules?.length || response.materialsCount || 0,
        accessCode: response.access_code || response.accessCode,
        lastActivity: 'Just joined',
        progress: 0,
        color: 'bg-green-500',
      };
      
      setCourses((prev) => [joinedCourse, ...prev]);
      setShowJoinCourseDialog(false);
      setAccessCode('');
      sonnerToast.success('🎉 Successfully joined the course! +15 XP earned');
    } catch (error: any) {
      console.error('Failed to join course:', error);
      
      // Handle different error scenarios
      const errorMessage = error?.response?.data?.error || error?.message || '';
      
      if (error?.response?.status === 404 || errorMessage.includes('Invalid access code')) {
        sonnerToast.error('❌ Invalid access code. Please check and try again.');
      } else if (error?.response?.status === 409 || errorMessage.includes('already enrolled')) {
        sonnerToast.error('📚 You are already enrolled in this course.');
      } else if (error?.response?.status === 401) {
        sonnerToast.error('🔒 Please sign in to join a course.');
      } else {
        sonnerToast.error('Failed to join course. Please try again.');
      }
    } finally {
      setJoiningCourse(false);
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'published' && course.published) ||
      (filter === 'draft' && !course.published);
    return matchesSearch && matchesFilter;
  });

  const publishedCount = courses.filter((c) => c.published).length;
  const draftCount = courses.filter((c) => !c.published).length;

  // Mock upcoming deadlines - in real app, this would come from API
  const getUpcomingDeadlines = () => {
    // Simulate course-related deadlines
    const deadlines = [
      { course: 'CS229', task: 'Assignment 3 grading', dueIn: '2 days' },
      { course: 'CS224n', task: 'Quiz review', dueIn: '3 days' },
      { course: 'CS231n', task: 'Project submissions', dueIn: '5 days' },
    ];
    return deadlines.length;
  };

  const upcomingDeadlines = getUpcomingDeadlines();

  if (loading) {
    return (
      <SharedDashboardLayout currentUser={currentUser}>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your courses...</p>
          </div>
        </div>
      </SharedDashboardLayout>
    );
  }

  return (
    <SharedDashboardLayout
      currentUser={currentUser}
      pageTitle="My Courses"
      showGamification={false}
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">
                  Total Courses
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {courses.length}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Published</p>
                <p className="text-2xl font-bold text-green-900">
                  {publishedCount}
                </p>
              </div>
              <Eye className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Drafts</p>
                <p className="text-2xl font-bold text-orange-900">
                  {draftCount}
                </p>
              </div>
              <EyeOff className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">
                  Upcoming Deadlines
                </p>
                <p className="text-2xl font-bold text-purple-900">
                  {upcomingDeadlines}
                </p>
                <p className="text-xs text-purple-600">Tasks due this week</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search your courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[120px]">
                <Filter className="h-4 w-4 mr-2" />
                {filter === 'all'
                  ? 'All Courses'
                  : filter === 'published'
                    ? 'Published'
                    : 'Drafts'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilter('all')}>
                All Courses
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('published')}>
                Published Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('draft')}>
                Drafts Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={() => setShowJoinCourseDialog(true)}
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Join Course
          </Button>
          
          <Button
            onClick={() => setShowCourseForm(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Button>
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No courses found' : 'No courses yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first course to get started'}
          </p>
          {!searchQuery && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => setShowJoinCourseDialog(true)}
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Join with Code
              </Button>
              <Button
                onClick={() => setShowCourseForm(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Course
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card
              key={course.id}
              className="transition-all duration-200 cursor-pointer group border border-blue-200 hover:border-blue-400 hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-gray-50/50 to-white"
              onClick={() => router.push(`/courses/${course.id}`)}
              style={{
                boxShadow: '0px 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              <CardHeader className="pb-3 relative">
                {/* Enhanced Status Badge - Top Left */}
                <div className="absolute -top-1 -left-1 z-10">
                  <Badge
                    className={`text-xs font-medium px-2 py-1 shadow-sm border-0 ${
                      course.published
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-500 text-white'
                    }`}
                  >
                    {course.published ? (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        Published
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3 mr-1" />
                        Draft
                      </>
                    )}
                  </Badge>
                </div>

                <div className="flex items-start justify-between pt-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div
                        className={`w-3 h-3 rounded-full ${course.color} shadow-sm`}
                      />
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        {course.code}
                      </span>
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {course.title}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{course.term}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/courses/${course.id}`);
                          }}
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          Open Course
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCourse(course);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingCourse(course);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {course.description || 'No description provided'}
                </p>

                {/* Enhanced Progress Bar */}
                {course.progress !== undefined && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Course Development</span>
                      <span>{course.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Original 3-Column Stats Layout */}
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <div className="flex items-center justify-center text-blue-600 mb-1">
                      <Users className="h-4 w-4" />
                    </div>
                    <p className="font-semibold text-gray-900">
                      {course.studentsCount}
                    </p>
                    <p className="text-xs text-gray-500">Students</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center text-green-600 mb-1">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <p className="font-semibold text-gray-900">
                      {course.materialsCount}
                    </p>
                    <p className="text-xs text-gray-500">Materials</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center text-orange-600 mb-1">
                      <Clock className="h-4 w-4" />
                    </div>
                    <p className="font-semibold text-gray-900 text-xs">
                      {course.lastActivity}
                    </p>
                    <p className="text-xs text-gray-500">Updated</p>
                  </div>
                </div>

                {course.accessCode && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg text-center">
                    <p className="text-xs text-blue-600 mb-1 font-medium">
                      Access Code
                    </p>
                    <p className="font-mono font-bold text-blue-700 text-lg tracking-wider">
                      {course.accessCode}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Course Dialog */}
      <Dialog open={showCourseForm} onOpenChange={setShowCourseForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
          </DialogHeader>
          <CourseForm
            userRole="student"
            onSave={handleCreateCourse}
            onCancel={() => setShowCourseForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Course Dialog */}
      {editingCourse && (
        <Dialog
          open={!!editingCourse}
          onOpenChange={() => setEditingCourse(null)}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Course</DialogTitle>
            </DialogHeader>
            <CourseForm
              course={editingCourse}
              userRole="student"
              onSave={handleEditCourse}
              onCancel={() => setEditingCourse(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Join Course Dialog */}
      <Dialog open={showJoinCourseDialog} onOpenChange={setShowJoinCourseDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-green-600" />
              Join Course with Access Code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Access Code
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="e.g., ABC12345"
                  value={accessCode}
                  onChange={(e) => {
                    // Only allow alphanumeric characters
                    const filtered = e.target.value.replace(/[^A-Za-z0-9]/g, '');
                    setAccessCode(filtered.toUpperCase());
                  }}
                  className="pl-10 text-center font-mono text-lg tracking-wider uppercase"
                  maxLength={8}
                  disabled={joiningCourse}
                  autoComplete="off"
                  spellCheck={false}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && accessCode.trim()) {
                      handleJoinCourse();
                    }
                  }}
                />
              </div>
              <p className="text-sm text-gray-500">
                💡 Get the access code from your instructor to join their course
              </p>
              {accessCode.length > 0 && accessCode.length < 8 && (
                <p className="text-xs text-orange-600 mt-1">
                  Access codes are typically 8 characters long ({accessCode.length}/8)
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-blue-900">
                    How to Join a Course
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Your instructor will provide you with a unique access code. 
                    Enter it above to instantly join their course and access all materials.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowJoinCourseDialog(false);
                  setAccessCode('');
                }}
                disabled={joiningCourse}
              >
                Cancel
              </Button>
              <Button
                onClick={handleJoinCourse}
                disabled={!accessCode.trim() || joiningCourse}
                className="bg-green-600 hover:bg-green-700"
              >
                {joiningCourse ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Joining...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Join Course
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingCourse}
        onOpenChange={() => setDeletingCourse(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCourse?.title}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCourse}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SharedDashboardLayout>
  );
}
