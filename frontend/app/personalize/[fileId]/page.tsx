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
  AlertCircle,
  Save
} from 'lucide-react';

// Enhanced hooks and components
import { useEnhancedPersonalization } from './hooks/useEnhancedPersonalization';
import { usePersonalizationAnalytics } from './hooks/usePersonalizationAnalytics';
import { EnhancedStreamingContent } from './components/EnhancedStreamingContent';
import { EnhancedOutline } from './components/EnhancedOutline';
import { PersonalizationErrorBoundary } from './components/PersonalizationErrorBoundary';
import { PersonalizationSkeleton } from './components/PersonalizationSkeleton';

function PersonalizedStreamingPageContent() {
  const { fileId } = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuthUser();
  
  // Get query parameters
  const [queryParams, setQueryParams] = useState({
    courseId: null as string | null,
    moduleId: null as string | null,
    fileName: 'Document'
  });
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      setQueryParams({
        courseId: searchParams.get('courseId'),
        moduleId: searchParams.get('moduleId'),
        fileName: searchParams.get('fileName') || 'Document'
      });
    }
  }, []);

  // Auto-start streaming on page load
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  
  // Enhanced personalization hook
  const {
    outline,
    sections,
    currentSection,
    progress,
    isStreaming,
    error,
    generateOutline,
    startStreaming,
    stopStreaming,
    navigateToSection,
    saveContent,
    trackFeedback
  } = useEnhancedPersonalization(fileId as string);

  // Analytics hook
  const {
    trackSectionView,
    trackSectionComplete,
    trackFeedback: trackAnalyticsFeedback,
    trackSessionComplete,
    trackError,
    updateScrollDepth,
    trackInteraction,
    getEngagementScore,
  } = usePersonalizationAnalytics(fileId as string);

  // Auto-generate outline when page loads
  useEffect(() => {
    if (!isInitialized && currentUser && fileId) {
      setIsInitialized(true);
      generateOutline().then((generatedOutline) => {
        if (generatedOutline && generatedOutline.length > 0) {
          toast.success('Document outline generated successfully');
        }
      }).catch((err) => {
        toast.error('Failed to generate outline');
        trackError('Failed to generate outline', { error: err.message });
      });
    }
  }, [currentUser, fileId, isInitialized, generateOutline]);

  // Auto-save when streaming completes
  useEffect(() => {
    if (!isStreaming && progress === 100 && !hasSaved) {
      setHasSaved(true);
      const engagementScore = getEngagementScore();
      trackSessionComplete({ engagement_score: engagementScore });
      
      saveContent().then((success) => {
        if (success) {
          toast.success('Your personalized content has been saved');
        }
      });
    }
  }, [isStreaming, progress, hasSaved, saveContent, trackSessionComplete, getEngagementScore]);

  // Calculate stats
  const stats = {
    wordsGenerated: Array.from(sections.values()).join(' ').split(' ').filter(w => w).length,
    estimatedReadTime: Math.ceil(Array.from(sections.values()).join(' ').split(' ').filter(w => w).length / 200),
    sectionsComplete: outline.filter(s => s.isComplete).length,
    totalSections: outline.length
  };

  // Handle streaming control
  const handleStreamingControl = () => {
    if (isStreaming) {
      stopStreaming();
    } else if (outline.length > 0) {
      startStreaming();
    } else {
      generateOutline().then(() => {
        startStreaming();
      });
    }
  };

  // Handle section feedback
  const handleSectionFeedback = (sectionId: string, feedbackType: 'helpful' | 'not_helpful') => {
    trackFeedback(sectionId, feedbackType);
    trackAnalyticsFeedback(sectionId, feedbackType);
    toast.success('Thank you for your feedback!');
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
      {!isInitialized ? (
        <PersonalizationSkeleton />
      ) : (
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with file info and controls */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{queryParams.fileName}</h1>
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
            {progress === 100 && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Complete
              </Badge>
            )}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <Card className="p-4 border-destructive">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-medium">Error</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => window.location.reload()}
              >
                <RotateCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </Card>
        )}

        {/* Start button if not started */}
        {outline.length === 0 && !isStreaming && !error && (
          <Card className="p-8 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <Zap className="w-16 h-16 mx-auto text-primary" />
              <h2 className="text-2xl font-semibold">Ready to Personalize</h2>
              <p className="text-muted-foreground">
                Click the button below to start generating personalized content based on your learning style
              </p>
              <Button 
                size="lg"
                onClick={handleStreamingControl}
                className="gap-2"
              >
                <Play className="w-5 h-5" />
                Start Personalization
              </Button>
            </div>
          </Card>
        )}

        {/* Main Content Area */}
        {(outline.length > 0 || isStreaming) && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar with enhanced outline */}
          <div className="lg:col-span-1">
            <EnhancedOutline
              outline={outline}
              progress={progress}
              currentSection={currentSection}
              isStreaming={isStreaming}
              onNavigate={navigateToSection}
              onGenerate={handleStreamingControl}
            />
          </div>

          {/* Main streaming content */}
          <div className="lg:col-span-3">
            <Card className="relative min-h-[600px]">
              {/* Content header controls */}
              <div className="sticky top-0 z-10 bg-background border-b p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isStreaming ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={stopStreaming}
                      >
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </Button>
                    ) : outline.length > 0 && !outline.every(s => s.isComplete) && (
                      <Button
                        size="sm"
                        onClick={startStreaming}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Resume
                      </Button>
                    )}
                    
                    {progress === 100 && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const content = Array.from(sections.entries())
                              .map(([id, text]) => {
                                const section = outline.find(s => s.anchor === id);
                                return `## ${section?.title || id}\n\n${text}`;
                              })
                              .join('\n\n');
                            
                            const blob = new Blob([content], { type: 'text/markdown' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${queryParams.fileName}-personalized.md`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => saveContent()}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {stats.sectionsComplete} / {stats.totalSections} sections
                  </div>
                </div>
              </div>
              
              {/* Enhanced streaming content */}
              <EnhancedStreamingContent
                sections={sections}
                outline={outline}
                isStreaming={isStreaming}
                currentSection={currentSection}
                showSectionIndicator={true}
              />
            </Card>
          </div>
        </div>
        )}

        {/* Bottom action bar */}
        {progress === 100 && (
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">
                  Personalization complete! Your content is ready.
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (queryParams.courseId && queryParams.moduleId) {
                      router.push(`/courses/${queryParams.courseId}/modules/${queryParams.moduleId}`);
                    } else {
                      router.push('/my-courses');
                    }
                  }}
                >
                  Back to Module
                </Button>
                <Button
                  onClick={() => {
                    toast.success('Great job! Your personalized study session is complete.');
                    if (queryParams.courseId) {
                      router.push(`/courses/${queryParams.courseId}`);
                    } else {
                      router.push('/my-courses');
                    }
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete Session
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
      )}
    </SharedDashboardLayout>
  );
}

export default function PersonalizedStreamingPage() {
  return (
    <PersonalizationErrorBoundary>
      <PersonalizedStreamingPageContent />
    </PersonalizationErrorBoundary>
  );
}