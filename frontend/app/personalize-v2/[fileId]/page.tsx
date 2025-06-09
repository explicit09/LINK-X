'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft, Save, Download, RotateCcw, BarChart, Settings, Bell, User, ChevronRight } from 'lucide-react';
import { HierarchicalOutline } from './components/v2/HierarchicalOutline';
import { MainContentArea } from './components/v2/MainContentArea';
import { ContextPanel } from './components/v2/ContextPanel';
import { useEnhancedPersonalization } from './hooks/useEnhancedPersonalization';
import { toComponentUser } from '@/types/auth';

export default function PersonalizePageV2() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, isLoading, isAuthenticated } = useAuth();
  
  const fileId = params?.fileId as string || '';
  const courseId = searchParams?.get('courseId') || '';
  const courseTitle = searchParams?.get('courseTitle') || '';
  
  const currentUser = toComponentUser(profile, user);
  
  // State
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [progress, setProgress] = useState(18); // Example progress
  const [streamSpeed, setStreamSpeed] = useState(1.2);
  
  const {
    outline,
    sections,
    currentSection,
    isStreaming,
    error,
    generateOutline,
    startStreaming,
  } = useEnhancedPersonalization(fileId);
  
  // Mock data for hierarchical structure
  const topics = [
    { id: '1', title: 'Introduction to Machine Learning', completed: true },
    { id: '2', title: 'Supervised Learning', completed: true },
    {
      id: '3',
      title: 'Neural Networks',
      completed: false,
      active: true,
      sections: [
        { id: '3.1', title: 'Introduction', completed: true },
        { id: '3.2', title: 'Core Concepts', completed: true },
        { id: '3.3', title: 'Examples', completed: false, active: true },
        { id: '3.4', title: 'Practice Problems', completed: false },
        { id: '3.5', title: 'Summary', completed: false },
      ]
    },
    { id: '4', title: 'Deep Learning Architectures', completed: false },
    { id: '5', title: 'Training and Optimization', completed: false },
    { id: '6', title: 'Real-world Applications', completed: false },
  ];
  
  // Handlers
  const handleBackToCourse = () => {
    if (courseId) {
      router.push(`/courses/${courseId}`);
    } else {
      router.push('/my-courses');
    }
  };
  
  const handleSpeedChange = () => {
    const speeds = [0.5, 0.75, 1, 1.2, 1.5, 2];
    const currentIndex = speeds.indexOf(streamSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setStreamSpeed(speeds[nextIndex]);
  };
  
  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving progress...');
  };
  
  const handleDownload = () => {
    // TODO: Implement download functionality
    console.log('Downloading content...');
  };
  
  const handleRegenerate = () => {
    // TODO: Implement regenerate functionality
    console.log('Regenerating content...');
  };
  
  const handleAnalytics = () => {
    // TODO: Show analytics
    console.log('Opening analytics...');
  };
  
  const handleSettings = () => {
    // TODO: Show settings
    console.log('Opening settings...');
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToCourse}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Course Home
          </Button>
          
          <div className="h-4 w-px bg-gray-300" />
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Progress {progress}%</span>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          
          <div className="h-4 w-px bg-gray-300" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSpeedChange}
            className="text-sm"
          >
            {streamSpeed}× Speed
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex h-[calc(100vh-7rem)]">
        {/* Outline Panel */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <HierarchicalOutline
            topics={topics}
            selectedTopic={selectedTopic}
            selectedSection={selectedSection}
            onTopicSelect={setSelectedTopic}
            onSectionSelect={setSelectedSection}
          />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <MainContentArea
            content={sections}
            currentSection={currentSection}
            isStreaming={isStreaming}
          />
        </div>
        
        {/* Context Panel Toggle */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setContextPanelOpen(!contextPanelOpen)}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full",
              "bg-white border border-gray-200 rounded-r-none",
              "hover:bg-gray-50 px-2 py-4"
            )}
          >
            <ChevronRight className={cn(
              "h-4 w-4 transition-transform",
              contextPanelOpen && "rotate-180"
            )} />
            <span className="ml-1 text-xs">CONTEXT</span>
          </Button>
          
          {/* Context Panel */}
          <ContextPanel
            isOpen={contextPanelOpen}
            onClose={() => setContextPanelOpen(false)}
            fileId={fileId}
          />
        </div>
      </div>
      
      {/* Bottom Toolbar */}
      <div className="h-14 bg-white border-t border-gray-200 flex items-center justify-center gap-6 px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Save
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Download
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRegenerate}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Regenerate
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAnalytics}
          className="gap-2"
        >
          <BarChart className="h-4 w-4" />
          Analytics
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSettings}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>
    </div>
  );
}