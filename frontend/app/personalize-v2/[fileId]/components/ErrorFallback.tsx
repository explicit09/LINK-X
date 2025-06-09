import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorFallbackProps {
  error: string;
  onRetry?: () => void;
  onBack?: () => void;
}

export function ErrorFallback({ error, onRetry, onBack }: ErrorFallbackProps) {
  // Determine error type and provide helpful message
  const getErrorDetails = () => {
    if (error.toLowerCase().includes('network') || error.toLowerCase().includes('fetch')) {
      return {
        title: 'Connection Issue',
        message: 'Unable to connect to our servers. Please check your internet connection and try again.',
        icon: '🌐'
      };
    }
    
    if (error.toLowerCase().includes('unauthorized') || error.toLowerCase().includes('auth')) {
      return {
        title: 'Authentication Required',
        message: 'Your session has expired. Please sign in again to continue.',
        icon: '🔐'
      };
    }
    
    if (error.toLowerCase().includes('not found')) {
      return {
        title: 'Content Not Found',
        message: 'The requested content could not be found. It may have been moved or deleted.',
        icon: '🔍'
      };
    }
    
    return {
      title: 'Something went wrong',
      message: error || 'An unexpected error occurred while personalizing your content.',
      icon: '⚠️'
    };
  };

  const { title, message, icon } = getErrorDetails();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full p-6 text-center">
        {/* Icon */}
        <div className="mb-4 text-4xl">{icon}</div>
        
        {/* Error Title */}
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        
        {/* Error Message */}
        <p className="text-muted-foreground mb-6">{message}</p>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {onRetry && (
            <Button onClick={onRetry} variant="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          
          {onBack && (
            <Button onClick={onBack} variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          )}
        </div>
        
        {/* Technical Details (collapsible) */}
        <details className="mt-6 text-left">
          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
            Technical details
          </summary>
          <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto">
            {error}
          </pre>
        </details>
      </Card>
    </div>
  );
}