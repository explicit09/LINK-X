'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEnhancedPersonalization } from './hooks/useEnhancedPersonalization';
import { PersonalizationSkeleton } from './components/PersonalizationSkeleton';
import { PersonalizationErrorBoundary } from './components/PersonalizationErrorBoundary';
import { EnhancedStreamingContent } from './components/EnhancedStreamingContent';
import { EnhancedOutline } from './components/EnhancedOutline';
import { TokenBudgetIndicator } from './components/TokenBudgetIndicator';
import { StreamingControls } from './components/StreamingControls';
import { Zap, Play, Pause, RefreshCw } from 'lucide-react';

export default function EnhancedPersonalizePage() {
  const { fileId } = useParams();
  const { user } = useAuth();
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
    resetSession,
  } = useEnhancedPersonalization(fileId as string);

  const [hasGeneratedOutline, setHasGeneratedOutline] = useState(false);

  if (!user) {
    return (
      <div className="container mx-auto p-8">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please sign in to access personalized content</p>
        </Card>
      </div>
    );
  }

  return (
    <PersonalizationErrorBoundary>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Enhanced Personalization</h1>
          <TokenBudgetIndicator />
        </div>

        {/* Controls */}
        <StreamingControls 
          isStreaming={isStreaming}
          hasGeneratedOutline={hasGeneratedOutline}
          onGenerateOutline={async () => {
            await generateOutline();
            setHasGeneratedOutline(true);
          }}
          onStartStreaming={startStreaming}
          onStopStreaming={stopStreaming}
          onReset={resetSession}
          progress={progress}
          error={error}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Outline Sidebar */}
          <div className="lg:col-span-1">
            <Suspense fallback={<PersonalizationSkeleton />}>
              <EnhancedOutline
                outline={outline}
                currentSection={currentSection}
                progress={progress}
              />
            </Suspense>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Suspense fallback={<PersonalizationSkeleton />}>
              <EnhancedStreamingContent
                sections={sections}
                currentSection={currentSection}
                isStreaming={isStreaming}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </PersonalizationErrorBoundary>
  );
}