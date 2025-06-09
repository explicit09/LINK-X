'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEnhancedPersonalization } from './hooks/useEnhancedPersonalization';
import { PersonalizationSkeleton } from './components/PersonalizationSkeleton';
import { PersonalizationErrorBoundary } from './components/PersonalizationErrorBoundary';
import { EnhancedStreamingContent } from './components/EnhancedStreamingContent';
import { EnhancedOutline } from './components/EnhancedOutline';
import { TokenBudgetIndicator } from './components/TokenBudgetIndicator';
import { Loader2, AlertCircle, CheckCircle2, Sparkles, ArrowLeft } from 'lucide-react';
import { toComponentUser } from '@/types/auth';

export default function EnhancedPersonalizePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, isLoading, isAuthenticated } = useAuth();
  
  // Get IDs from params and search params
  const fileId = params?.fileId as string || '';
  const courseId = searchParams?.get('courseId') || '';
  const moduleId = searchParams?.get('moduleId') || '';
  
  // Convert user for layout
  const currentUser = toComponentUser(profile, user);
  
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
  } = useEnhancedPersonalization(fileId);

  const [status, setStatus] = useState<'initializing' | 'generating-outline' | 'streaming' | 'complete' | 'error'>('initializing');
  const [hasStartedGeneration, setHasStartedGeneration] = useState(false);

  // Auto-start the personalization flow
  useEffect(() => {
    const startAutomaticFlow = async () => {
      if (!user || !fileId || hasStartedGeneration) return;
      
      try {
        setHasStartedGeneration(true);
        setStatus('generating-outline');
        
        console.log('🚀 Starting automatic personalization flow for file:', fileId);
        console.log('User:', user);
        console.log('Profile:', profile);
        
        // Generate outline
        await generateOutline();
        
        // Small delay to show outline before streaming
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Start streaming automatically
        setStatus('streaming');
        await startStreaming();
        
      } catch (err: any) {
        console.error('❌ Automatic flow failed:', err);
        console.error('Error details:', err.message, err.stack);
        setStatus('error');
      }
    };

    // Start after a small delay to ensure everything is loaded
    const timer = setTimeout(startAutomaticFlow, 100);
    return () => clearTimeout(timer);
  }, [user, fileId, hasStartedGeneration, generateOutline, startStreaming]);

  // Update status based on streaming state
  useEffect(() => {
    if (isStreaming) {
      setStatus('streaming');
    } else if (progress === 100 && outline?.length > 0) {
      setStatus('complete');
    }
  }, [isStreaming, progress, outline]);

  // Show loading skeleton while checking auth or if no fileId
  if (isLoading || !fileId) {
    return <PersonalizationSkeleton />;
  }

  // Handle back navigation
  const handleBackToCourse = () => {
    if (courseId) {
      router.push(`/courses/${courseId}`);
    } else {
      router.push('/my-courses');
    }
  };

  return (
    <SharedDashboardLayout
      currentUser={currentUser}
      showGamification={false}
      defaultSidebarOpen={false}
      className="max-w-7xl mx-auto"
    >
      <PersonalizationErrorBoundary>
        <div className="space-y-6 pt-10">
          {/* Header with Back Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToCourse}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Course
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-2xl font-bold">AI Study Assistant</h1>
            </div>
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              {status === 'generating-outline' && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analyzing content...</span>
                </div>
              )}
              {status === 'streaming' && (
                <div className="flex items-center gap-2 text-purple-600">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <span className="text-sm">Personalizing for you...</span>
                </div>
              )}
              {status === 'complete' && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Ready to learn!</span>
                </div>
              )}
              {status === 'error' && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Something went wrong</span>
                </div>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {error && status === 'error' && (
            <Card className="p-4 border-red-200 bg-red-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm">{error}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setStatus('generating-outline');
                    setHasStartedGeneration(false);
                  }}
                >
                  Try Again
                </Button>
              </div>
            </Card>
          )}

          {/* Progress Bar */}
          {(status === 'streaming' || status === 'complete') && progress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Outline Sidebar */}
            <div className="lg:col-span-1">
              <Suspense fallback={<PersonalizationSkeleton />}>
                <EnhancedOutline
                outline={(outline || []).map((section, index) => ({
                  anchor: section.anchor,
                  title: section.title,
                  isComplete: section.isComplete || false,
                  order: index + 1,
                  content_preview: section.content_preview
                }))}
                currentSection={currentSection}
                progress={progress}
                isStreaming={isStreaming}
              />
            </Suspense>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              <Suspense fallback={<PersonalizationSkeleton />}>
                <EnhancedStreamingContent
                  outline={outline || []}
                  sections={sections}
                  currentSection={currentSection}
                  isStreaming={isStreaming}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </PersonalizationErrorBoundary>
    </SharedDashboardLayout>
  );
}