'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  ChevronLeft,
  Download,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import new components
import { MinimalHeader } from './components/MinimalHeader';
import { StreamedContent } from './components/StreamedContent';
import { CollapsibleOutline } from './components/CollapsibleOutline';
import { useStreamingPersonalization } from './hooks/useStreamingPersonalization';
import { ErrorFallback } from './components/ErrorFallback';

export default function PersonalizationPageV2() {
  const { fileId } = useParams();
  const router = useRouter();
  const { user } = useAuthUser();
  const contentRef = useRef<HTMLDivElement>(null);
  
  // State
  const [showOutline, setShowOutline] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Get query parameters
  const [metadata, setMetadata] = useState({
    courseId: null as string | null,
    moduleId: null as string | null,
    fileName: 'Document',
    courseName: '',
    moduleName: ''
  });
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      setMetadata({
        courseId: searchParams.get('courseId'),
        moduleId: searchParams.get('moduleId'),
        fileName: searchParams.get('fileName') || 'Document',
        courseName: searchParams.get('courseName') || '',
        moduleName: searchParams.get('moduleName') || ''
      });
    }
  }, []);

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use improved streaming hook
  const {
    sections,
    outline,
    currentSection,
    progress,
    isStreaming,
    error,
    isInitializing,
    startPersonalization,
    pauseStreaming,
    resumeStreaming,
    downloadContent,
    resetPersonalization
  } = useStreamingPersonalization(fileId as string, {
    autoStart: true,
    cacheEnabled: true,
    streamingChunkSize: 1000
  });

  // Handle navigation back
  const handleBack = () => {
    if (metadata.courseId && metadata.moduleId) {
      router.push(`/courses/${metadata.courseId}/modules/${metadata.moduleId}`);
    } else if (metadata.courseId) {
      router.push(`/courses/${metadata.courseId}`);
    } else {
      router.push('/my-courses');
    }
  };

  // Handle completion
  const handleComplete = () => {
    toast.success('Great job! Your personalized study session is complete.');
    handleBack();
  };

  // Auth guard
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-xl font-semibold mb-2">Sign in Required</h2>
          <p className="text-muted-foreground mb-4">Please sign in to access personalized content</p>
          <Button onClick={() => router.push('/login')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !isStreaming) {
    return (
      <ErrorFallback 
        error={error}
        onRetry={resetPersonalization}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <MinimalHeader
        title={metadata.fileName}
        subtitle={metadata.moduleName || metadata.courseName}
        onBack={handleBack}
        actions={
          <div className="flex items-center gap-2">
            {progress === 100 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={downloadContent}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Download</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowOutline(!showOutline)}
              className="md:hidden"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      {/* Progress Bar */}
      {(isStreaming || progress > 0) && progress < 100 && (
        <div className="fixed top-14 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm border-b">
          <Progress value={progress} className="h-1 rounded-none" />
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative flex h-[calc(100vh-3.5rem)]">
        {/* Collapsible Outline - Desktop */}
        <div className={cn(
          "hidden md:block",
          "w-64 lg:w-80 border-r bg-muted/30",
          "transition-all duration-300 ease-in-out",
          !showOutline && "md:hidden"
        )}>
          <CollapsibleOutline
            outline={outline}
            currentSection={currentSection}
            onNavigate={(sectionId) => {
              const element = document.getElementById(sectionId);
              element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            progress={progress}
            isStreaming={isStreaming}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto" ref={contentRef}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Loading State */}
            {isInitializing && sections.size === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <BookOpen className="w-12 h-12 mb-4 text-muted-foreground animate-pulse" />
                <h3 className="text-lg font-medium mb-2">Preparing your personalized content</h3>
                <p className="text-sm text-muted-foreground">This will just take a moment...</p>
              </div>
            )}

            {/* Streamed Content */}
            {sections.size > 0 && (
              <StreamedContent
                sections={sections}
                outline={outline}
                currentSection={currentSection}
                isStreaming={isStreaming}
                onSectionComplete={(sectionId) => {
                  // Track section completion
                  console.log('Section completed:', sectionId);
                }}
              />
            )}

            {/* Completion State */}
            {progress === 100 && (
              <div className="mt-12 p-6 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Personalization Complete!</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your content has been tailored to your learning style and preferences.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={handleComplete}>
                        Complete Session
                      </Button>
                      <Button variant="outline" onClick={downloadContent}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button variant="outline" onClick={handleBack}>
                        Back to Module
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Outline Overlay */}
        {isMobile && showOutline && (
          <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm md:hidden">
            <div className="h-full overflow-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Document Outline</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowOutline(false)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
                <CollapsibleOutline
                  outline={outline}
                  currentSection={currentSection}
                  onNavigate={(sectionId) => {
                    setShowOutline(false);
                    const element = document.getElementById(sectionId);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  progress={progress}
                  isStreaming={isStreaming}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Controls for Mobile */}
      {isMobile && isStreaming && (
        <div className="fixed bottom-4 left-4 right-4 z-40">
          <div className="bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Personalizing content...
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={pauseStreaming}
              >
                Pause
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}