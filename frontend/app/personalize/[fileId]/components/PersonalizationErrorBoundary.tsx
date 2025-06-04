'use client';

import React, { Component, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// Wrapper component to use hooks in error boundary
function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  const router = useRouter();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-lg w-full p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 bg-destructive/10 rounded-full">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Something went wrong</h2>
            <p className="text-muted-foreground">
              We encountered an error while loading your personalized content.
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="w-full mt-4 p-4 bg-muted rounded-lg text-left">
              <summary className="cursor-pointer font-medium">Error details</summary>
              <pre className="mt-2 text-xs overflow-auto">
                {error.stack || error.message}
              </pre>
            </details>
          )}

          <div className="flex gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => router.push('/my-courses')}
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Courses
            </Button>
            <Button onClick={resetError}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export class PersonalizationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PersonalizationErrorBoundary caught an error:', error, errorInfo);
    
    // Log to analytics or error tracking service
    if (typeof window !== 'undefined' && window.navigator.sendBeacon) {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      };
      
      try {
        const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        window.navigator.sendBeacon(
          `${baseURL}/api/personalization/v2/analytics`,
          JSON.stringify({
            events: [{
              event_type: 'error',
              file_id: 'unknown',
              timestamp: Date.now(),
              data: errorData,
            }],
          })
        );
      } catch (e) {
        console.error('Failed to send error analytics:', e);
      }
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }
      
      return <ErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}