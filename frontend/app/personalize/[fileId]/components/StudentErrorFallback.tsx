'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, Home, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

interface StudentErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
}

export function StudentErrorFallback({ error, resetError }: StudentErrorFallbackProps) {
  const router = useRouter();

  // Friendly error messages based on error type
  const getFriendlyMessage = (error?: Error) => {
    if (!error) return "Something went wrong, but don't worry!";

    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return "It looks like there's a connection issue. Check your internet and try again!";
    }
    
    if (message.includes('auth') || message.includes('unauthorized')) {
      return "Please log in to continue learning!";
    }
    
    if (message.includes('not found')) {
      return "We couldn't find that file. It might have been moved or deleted.";
    }
    
    if (message.includes('timeout')) {
      return "This is taking longer than expected. Let's try again!";
    }

    return "Something unexpected happened, but we can fix it!";
  };

  const suggestions = [
    "Try refreshing the page",
    "Check your internet connection",
    "Go back to your dashboard and try again",
    "If this keeps happening, let your teacher know"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="max-w-lg w-full p-8 text-center space-y-6">
          {/* Friendly Icon */}
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-block"
          >
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-yellow-600" />
            </div>
          </motion.div>

          {/* Error Message */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              Oops! 😅
            </h2>
            <p className="text-gray-600">
              {getFriendlyMessage(error)}
            </p>
          </div>

          {/* Helpful Suggestions */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <p className="font-medium text-gray-800 flex items-center justify-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Here's what you can try:
            </p>
            <ul className="text-sm text-gray-700 space-y-1 text-left max-w-sm mx-auto">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => {
                if (resetError) {
                  resetError();
                } else {
                  window.location.reload();
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>

          {/* Fun Encouragement */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-gray-500"
          >
            Don't worry, even the best students face hiccups sometimes! 💪
          </motion.p>
        </Card>
      </motion.div>
    </div>
  );
}