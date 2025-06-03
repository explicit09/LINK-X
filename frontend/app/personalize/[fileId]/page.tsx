'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCw, 
  Download,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// Custom hooks for streaming functionality
import { usePersonalizedStreaming } from './hooks/usePersonalizedStreaming';
import { useStreamingSession } from './hooks/useStreamingSession';

// Components
import { StreamingContent } from './components/StreamingContent';
import { OutlineProgress } from './components/OutlineProgress';
import { StreamingControls } from './components/StreamingControls';

export default function PersonalizedStreamingPage() {
  const { fileId } = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuthUser();
  
  // Get query parameters
  const searchParams = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : ''
  );
  const courseId = searchParams.get('courseId');
  const moduleId = searchParams.get('moduleId');
  const fileName = searchParams.get('fileName') || 'Document';

  // Auto-start streaming on page load
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Custom hooks
  const {
    streamingState,
    content,
    outline,
    progress,
    currentSection,
    error,
    startStreaming,
    pauseStreaming,
    resumeStreaming,
    skipSection,
    regenerateSection,
    retryConnection,
    showAllContent
  } = usePersonalizedStreaming(fileId as string);

  const {
    sessionId,
    saveSession,
    loadSession,
    lastSaved,
    isAutoSaving
  } = useStreamingSession(fileId as string, content, progress);

  // Auto-start streaming when page loads
  useEffect(() => {
    if (!isInitialized && currentUser && fileId) {
      setIsInitialized(true);
      // Load existing session or start new streaming
      loadSession().then((existingSession) => {
        if (existingSession) {
          toast.success('Resuming your previous session');
        } else {
          startStreaming();
        }
      });
    }
  }, [currentUser, fileId, isInitialized]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (streamingState === 'streaming' || streamingState === 'paused') {
      const interval = setInterval(() => {
        saveSession();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [streamingState, saveSession]);


  // Calculate stats
  const stats = {
    wordsGenerated: content ? content.split(' ').length : 0,
    estimatedReadTime: Math.ceil((content ? content.split(' ').length : 0) / 200),
    sectionsComplete: outline ? outline.sections.filter(s => s.isComplete).length : 0,
    totalSections: outline ? outline.sections.length : 0
  };

  if (!currentUser) {
    return (
      <SharedDashboardLayout 
        pageTitle="Personalized Learning" 
        currentUser={null}
        showGamification={false}
        defaultSidebarOpen={false}
      >
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <p className="text-lg">Please sign in to access personalized content</p>
          </Card>
        </div>
      </SharedDashboardLayout>
    );
  }

  return (
    <SharedDashboardLayout 
      pageTitle="Personalized Learning" 
      currentUser={currentUser}
      showGamification={true}
      defaultSidebarOpen={false}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with file info and controls */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{fileName}</h1>
            <p className="text-muted-foreground mt-1">
              AI-powered personalized content based on your learning style
            </p>
          </div>
          
          {/* Quick stats */}
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="gap-1">
              <Clock className="w-3 h-3" />
              {stats.estimatedReadTime} min read
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Zap className="w-3 h-3" />
              {stats.wordsGenerated} words
            </Badge>
            {lastSaved && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Saved {new Date(lastSaved).toLocaleTimeString()}
              </Badge>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar with outline and progress */}
          <div className="lg:col-span-1 space-y-4">
            <OutlineProgress
              outline={outline}
              currentSection={currentSection}
              progress={progress}
              onSectionClick={skipSection}
              onViewAll={showAllContent}
            />
            
          </div>

          {/* Main streaming content */}
          <div className="lg:col-span-3">
            <Card className="relative p-6 min-h-[600px]">
              {/* Controls positioned at top right */}
              <div className="absolute top-4 right-4 z-10">
                <StreamingControls
                  streamingState={streamingState}
                  onRegenerate={() => regenerateSection(currentSection)}
                  onDownload={() => {
                    // Download functionality
                    const blob = new Blob([content], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${fileName}-personalized.md`;
                    a.click();
                  }}
                />
              </div>
              {/* Content area with padding to avoid control overlap */}
              <div className="pt-12">
                {streamingState === 'initializing' ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <div className="flex items-center gap-2 mt-8">
                      <div className="animate-pulse">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Preparing your personalized content...
                      </p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <AlertCircle className="w-16 h-16 text-destructive" />
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-semibold">Connection Error</h3>
                      <p className="text-muted-foreground">{error}</p>
                    </div>
                    <Button onClick={retryConnection} variant="outline">
                      <RotateCw className="w-4 h-4 mr-2" />
                      Retry Connection
                    </Button>
                  </div>
                ) : (
                  <StreamingContent
                    content={content}
                    isStreaming={streamingState === 'streaming'}
                    currentSection={currentSection}
                    outline={outline}
                  />
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Bottom action bar */}
        <Card className="p-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Progress value={progress} className="w-32" />
              <span className="text-sm text-muted-foreground">
                {stats.sectionsComplete} of {stats.totalSections} sections complete
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {streamingState === 'complete' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/courses/${courseId}/modules/${moduleId}`)}
                  >
                    Back to Module
                  </Button>
                  <Button
                    onClick={() => {
                      // Mark as complete and redirect
                      toast.success('Great job! Your personalized study session is complete.');
                      router.push(`/courses/${courseId}`);
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete Session
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </SharedDashboardLayout>
  );
}