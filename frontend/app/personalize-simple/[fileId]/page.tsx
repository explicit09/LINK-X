'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useMockAuth as useAuth } from '@/contexts/MockAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEnhancedPersonalization } from '@/app/personalize/[fileId]/hooks/useEnhancedPersonalization';
import { Zap, Play } from 'lucide-react';

export default function SimplePersonalizePage() {
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
  } = useEnhancedPersonalization(fileId as string);

  const [hasGeneratedOutline, setHasGeneratedOutline] = useState(false);

  const handleStart = async () => {
    if (!hasGeneratedOutline) {
      await generateOutline();
      setHasGeneratedOutline(true);
    } else {
      startStreaming();
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Simple Personalization Test</h1>
      
      {!user ? (
        <Card className="p-6">
          <p>Please sign in to use personalization</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Status */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">
                  {isStreaming ? 'Streaming...' : error ? 'Error' : 'Ready'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="font-medium">{Math.round(progress)}%</p>
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-500 mt-2">{error}</p>
            )}
          </Card>

          {/* Control Button */}
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleStart}
              disabled={isStreaming}
              className="gap-2"
            >
              {isStreaming ? (
                <>Streaming...</>
              ) : hasGeneratedOutline ? (
                <>
                  <Play className="w-5 h-5" />
                  Start Streaming
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Generate Outline
                </>
              )}
            </Button>
          </div>

          {/* Outline */}
          {outline.length > 0 && (
            <Card className="p-4">
              <h2 className="font-semibold mb-4">Document Outline</h2>
              <div className="space-y-2">
                {outline.map((section) => (
                  <div
                    key={section.anchor}
                    className={`p-2 rounded ${
                      section.isComplete
                        ? 'bg-green-50'
                        : currentSection === section.anchor
                        ? 'bg-blue-50'
                        : 'bg-gray-50'
                    }`}
                  >
                    <p className="text-sm font-medium">{section.title}</p>
                    {section.isComplete && (
                      <p className="text-xs text-green-600">✓ Complete</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Content */}
          {sections.size > 0 && (
            <Card className="p-4">
              <h2 className="font-semibold mb-4">Personalized Content</h2>
              <div className="space-y-6">
                {Array.from(sections.entries()).map(([sectionId, content]) => (
                  <div key={sectionId} className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap">{content}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}