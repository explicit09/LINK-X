'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Brain, MessageSquare, Users } from 'lucide-react';
import { CourseProgress } from '../types/course.types';

interface CourseNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  courseProgress: CourseProgress;
}

export const CourseNavigation = ({
  activeTab,
  onTabChange,
  courseProgress,
}: CourseNavigationProps) => {
  return (
    <div className="bg-white/60 backdrop-blur-sm border-b border-gray-200/50">
      <div className="px-6">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="h-14 bg-transparent border-none p-0 w-full justify-start">
            <TabsTrigger
              value="home"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 data-[state=active]:text-gray-900 rounded-lg px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white/80 transition-all duration-200 font-medium"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Home
            </TabsTrigger>
            <TabsTrigger
              value="ai"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 data-[state=active]:text-gray-900 rounded-lg px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white/80 transition-all duration-200 font-medium"
            >
              <Brain className="h-4 w-4 mr-2" />
              AI Tutor
            </TabsTrigger>
            <TabsTrigger
              value="quizzes"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 data-[state=active]:text-gray-900 rounded-lg px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white/80 transition-all duration-200 font-medium"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Quizzes
            </TabsTrigger>
            <TabsTrigger
              value="people"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 data-[state=active]:text-gray-900 rounded-lg px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white/80 transition-all duration-200 font-medium"
            >
              <Users className="h-4 w-4 mr-2" />
              People
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="w-full bg-gray-200/50 h-0.5">
          <div
            className="h-0.5 bg-[#7B61FF] transition-all duration-500 ease-out"
            style={{ width: `${courseProgress.progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
