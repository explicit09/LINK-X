'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PersonalizedContentViewerProps {
  content: string;
  title?: string;
  fileId?: string;
  showOriginal?: boolean;
  className?: string;
}

export function PersonalizedContentViewer({
  content,
  title = 'Content',
  fileId,
  showOriginal = false,
  className = ''
}: PersonalizedContentViewerProps) {
  const { user, getAuthToken } = useAuthUser();
  const [personalizedContent, setPersonalizedContent] = useState<string>('');
  const [isPersonalizing, setIsPersonalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(showOriginal);
  const [metadata, setMetadata] = useState<{
    primaryInterest?: string;
    contentDomain?: string;
  }>({});

  useEffect(() => {
    if (content && user) {
      personalizeContent();
    }
  }, [content, user]);

  const personalizeContent = async () => {
    try {
      setIsPersonalizing(true);
      setError(null);

      const token = await getAuthToken();
      const response = await apiClient.post(
        '/content/personalize-content',
        {
          content,
          title,
          file_id: fileId
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.status === 'success') {
        setPersonalizedContent(response.data.data.personalized_content);
        setMetadata({
          primaryInterest: response.data.data.primary_interest,
          contentDomain: response.data.data.content_domain
        });
      } else {
        setError(response.data.error || 'Failed to personalize content');
      }
    } catch (err: any) {
      console.error('Personalization error:', err);
      setError(err.response?.data?.error || 'Failed to personalize content');
    } finally {
      setIsPersonalizing(false);
    }
  };

  const checkPersonalizationStatus = async () => {
    try {
      const token = await getAuthToken();
      const response = await apiClient.get('/content/check-personalization', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.data && !response.data.data.personalization_ready) {
        setError(response.data.data.message || 'Please complete your profile for personalized content');
      }
    } catch (err) {
      console.error('Status check error:', err);
    }
  };

  useEffect(() => {
    if (user && !personalizedContent) {
      checkPersonalizationStatus();
    }
  }, [user]);

  // Show loading state
  if (isPersonalizing) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Personalizing content for you...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Using your interests to make this content more engaging
          </p>
        </div>
      </Card>
    );
  }

  // Show error state
  if (error && !personalizedContent) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="w-8 h-8 text-destructive mb-4" />
          <p className="text-destructive font-medium">Personalization Error</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
          <Button 
            onClick={personalizeContent} 
            variant="outline" 
            size="sm" 
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  const displayContent = showRaw ? content : (personalizedContent || content);

  return (
    <div className={className}>
      {/* Personalization Header */}
      {personalizedContent && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Personalized for you</span>
            {metadata.primaryInterest && (
              <Badge variant="secondary" className="text-xs">
                {metadata.primaryInterest}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs"
          >
            {showRaw ? 'Show Personalized' : 'Show Original'}
          </Button>
        </div>
      )}

      {/* Content Display */}
      <Card className="p-6">
        <div className="prose dark:prose-invert max-w-none">
          {displayContent.split('\n').map((paragraph, idx) => (
            <p key={idx} className="mb-4">
              {paragraph}
            </p>
          ))}
        </div>
      </Card>

      {/* Personalization Notice */}
      {!personalizedContent && !isPersonalizing && (
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            This content is not personalized. Complete your profile to see content tailored to your interests.
          </p>
        </div>
      )}
    </div>
  );
}