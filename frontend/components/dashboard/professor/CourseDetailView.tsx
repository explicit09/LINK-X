import { ArrowLeft, Home, Users, Settings, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

import { HomeTab } from './tabs/HomeTab';
import { PeopleTab } from './tabs/PeopleTab';
import { ModulesTab } from './tabs/ModulesTab';
import { SettingsTab } from './tabs/SettingsTab';

import { Course } from './hooks/useCourses';
import { TabType } from './hooks/useProfessorNavigation';

interface CourseDetailViewProps {
  course: Course;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onBackToDashboard: () => void;
  courseHooks: any;
  moduleHooks: any;
  studentHooks: any;
}

export function CourseDetailView({
  course,
  activeTab,
  onTabChange,
  onBackToDashboard,
  courseHooks,
  moduleHooks,
  studentHooks,
}: CourseDetailViewProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={onBackToDashboard}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>

            <Badge variant={course.published ? 'default' : 'secondary'}>
              {course.published ? 'Published' : 'Draft'}
            </Badge>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{course.code}</span>
              <span>•</span>
              <span>{course.term}</span>
              <span>•</span>
              <span>{studentHooks.students.length} students enrolled</span>
            </div>
            {course.description && (
              <p className="text-gray-600 max-w-2xl">{course.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8">
        <Tabs
          value={activeTab}
          onValueChange={(value) => onTabChange(value as TabType)}
        >
          <TabsList className="mt-6">
            <TabsTrigger value="home" className="flex items-center space-x-2">
              <Home className="h-4 w-4" />
              <span>Home</span>
            </TabsTrigger>
            <TabsTrigger
              value="modules"
              className="flex items-center space-x-2"
            >
              <BookOpen className="h-4 w-4" />
              <span>Modules</span>
              <Badge variant="secondary" className="ml-1">
                {moduleHooks.modules.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="people" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>People</span>
              <Badge variant="secondary" className="ml-1">
                {studentHooks.students.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <div className="py-8">
            <TabsContent value="home">
              <HomeTab
                course={course}
                studentCount={studentHooks.students.length}
                moduleCount={moduleHooks.modules.length}
              />
            </TabsContent>

            <TabsContent value="modules">
              <ModulesTab course={course} moduleHooks={moduleHooks} />
            </TabsContent>

            <TabsContent value="people">
              <PeopleTab
                students={studentHooks.students}
                loading={studentHooks.loading}
                onRemoveStudent={studentHooks.removeStudent}
              />
            </TabsContent>

            <TabsContent value="settings">
              <SettingsTab
                course={course}
                onUpdateCourse={courseHooks.updateCourse}
                onDeleteCourse={courseHooks.deleteCourse}
                onTogglePublish={courseHooks.togglePublish}
                onBackToDashboard={onBackToDashboard}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
