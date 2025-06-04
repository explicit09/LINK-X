'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Enhanced components
import { EnhancedMinimalHeader } from './components/EnhancedMinimalHeader';
import { EnhancedStreamedContent } from './components/EnhancedStreamedContent';
import { EnhancedOutline } from './components/EnhancedOutline';
import { ErrorFallback } from './components/ErrorFallback';
import { useStreamingPersonalization } from './hooks/useStreamingPersonalization';

// Enhanced loading skeleton
const EnhancedLoadingSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-muted rounded-lg w-1/3 mb-2 animate-pulse" />
        <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
        <div className="grid grid-cols-5 gap-4 mt-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-muted rounded animate-pulse" />
              <div className="h-6 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-3 bg-muted rounded-full w-full mt-4 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Outline Skeleton */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="h-6 bg-muted rounded animate-pulse" />
              <div className="h-2 bg-muted rounded-full animate-pulse" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-16 bg-muted rounded-lg animate-pulse" />
                <div className="h-16 bg-muted rounded-lg animate-pulse" />
              </div>
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Content Skeleton */}
        <div className="lg:col-span-3">
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="space-y-4">
                  <div className="h-6 bg-muted rounded w-1/2 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

function EnhancedPersonalizationPageContent() {
  const { fileId } = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuthUser();
  
  // Get query parameters
  const [queryParams, setQueryParams] = useState({
    courseId: null as string | null,
    moduleId: null as string | null,
    fileName: 'Learning Material'
  });
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      setQueryParams({
        courseId: searchParams.get('courseId'),
        moduleId: searchParams.get('moduleId'),
        fileName: searchParams.get('fileName') || 'Learning Material'
      });
    }
  }, []);

  // Enhanced personalization hook with auto-start
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
    resetPersonalization,
    markSectionComplete,
    markSectionIncomplete
  } = useStreamingPersonalization(fileId as string, {
    autoStart: true, // Auto-start when page loads
    cacheEnabled: true,
    maxRetries: 3
  });

  // Calculate enhanced stats
  const completedSections = outline.filter(s => s.isComplete).length;
  const totalSections = outline.length;
  const estimatedReadTime = Math.ceil(
    Array.from(sections.values()).join(' ').split(' ').filter(w => w).length / 200
  );
  const xpEarned = completedSections * 50; // 50 XP per section

  // Handle navigation back
  const handleBack = () => {
    if (queryParams.courseId && queryParams.moduleId) {
      router.push(`/courses/${queryParams.courseId}`);
    } else {
      router.push('/my-courses');
    }
  };

  // Handle feedback
  const handleFeedback = (sectionId: string, feedback: 'helpful' | 'not_helpful') => {
    // TODO: Send feedback to analytics
    console.log('Feedback:', { sectionId, feedback });
    toast.success('Thank you for your feedback!');
  };

  // Handle section navigation
  const handleSectionNavigate = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle sharing
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Personalized Learning: ${queryParams.fileName}`,
          text: 'Check out this AI-personalized learning content!',
          url: window.location.href
        });
      } catch (err) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  // Handle save
  const handleSave = () => {
    // TODO: Implement save to user library
    toast.success('Content saved to your library!');
  };

  // Show authentication error
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">
            Please sign in to access your personalized learning content.
          </p>
          <Button onClick={() => router.push('/login')}>
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (isInitializing && outline.length === 0) {
    return <EnhancedLoadingSkeleton />;
  }

  // Show error state
  if (error && outline.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center">
        <ErrorFallback 
          error={error}
          onRetry={() => {
            resetPersonalization();
            startPersonalization();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Enhanced Header */}
      <EnhancedMinimalHeader
        title={queryParams.fileName}
        subtitle="AI-powered personalized content adapted to your learning style"
        progress={progress}
        isStreaming={isStreaming}
        completedSections={completedSections}
        totalSections={totalSections}
        estimatedReadTime={estimatedReadTime}
        xpEarned={xpEarned}
        onBack={handleBack}
        onDownload={progress === 100 ? downloadContent : undefined}
        onSave={progress === 100 ? handleSave : undefined}
        onShare={progress === 100 ? handleShare : undefined}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Banner */}
        {error && outline.length > 0 && (
          <Card className="p-4 mb-6 border-destructive bg-destructive/5">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Warning</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  resetPersonalization();
                  startPersonalization();
                }}
              >
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Enhanced Sidebar */}
          <div className="lg:col-span-1">
            <EnhancedOutline
              outline={outline}
              progress={progress}
              currentSection={currentSection}
              isStreaming={isStreaming}
              onNavigate={handleSectionNavigate}
              onStart={startPersonalization}
              onPause={pauseStreaming}
            />
          </div>

          {/* Enhanced Content */}
          <div className="lg:col-span-3">
            {outline.length > 0 ? (
              <EnhancedStreamedContent
                sections={sections}
                outline={outline}
                currentSection={currentSection}
                isStreaming={isStreaming}
                onSectionComplete={markSectionComplete}
                onSectionIncomplete={markSectionIncomplete}
                onFeedback={handleFeedback}
              />
            ) : (
              <Card className="p-8 text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-4 text-primary animate-spin" />
                <h3 className="text-lg font-semibold mb-2">Preparing Your Learning Content</h3>
                <p className="text-muted-foreground">
                  Our AI is analyzing the material and creating a personalized learning experience for you...
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* Completion Celebration */}
        {progress === 100 && (
          <Card className="mt-8 p-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-2xl">🎉</span>
              </div>
              <h3 className="text-2xl font-bold mb-2 text-green-700 dark:text-green-300">
                Congratulations! Learning Complete
              </h3>
              <p className="text-green-600 dark:text-green-400 mb-6 max-w-md mx-auto">
                You've successfully completed this personalized learning session. 
                You earned <strong>{xpEarned} XP</strong> and advanced your knowledge!
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={handleBack}>
                  Return to Course
                </Button>
                <Button variant="outline" onClick={downloadContent}>
                  Download Notes
                </Button>
                <Button variant="outline" onClick={handleShare}>
                  Share Progress
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function EnhancedPersonalizationPage() {
  return (
    <div className="min-h-screen">
      <EnhancedPersonalizationPageContent />
    </div>
  );
}