'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Play, Pause, RefreshCw, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StudentPersonalizationViewProps {
  fileId: string;
  fileName: string;
  courseId: string;
  courseName: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkipSection: () => void;
  isStreaming: boolean;
  isPaused: boolean;
  currentSection: number;
  totalSections: number;
  progress: number;
}

export function StudentPersonalizationView({
  fileId,
  fileName,
  courseId,
  courseName,
  onStart,
  onPause,
  onResume,
  onSkipSection,
  isStreaming,
  isPaused,
  currentSection,
  totalSections,
  progress
}: StudentPersonalizationViewProps) {
  const [showWelcome, setShowWelcome] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  const handleStart = () => {
    setShowWelcome(false);
    setHasStarted(true);
    onStart();
  };

  if (showWelcome && !hasStarted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto px-4 py-16"
      >
        <Card className="p-8 text-center space-y-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <Sparkles className="w-16 h-16 mx-auto text-blue-600" />
          </motion.div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Ready to Learn?
            </h1>
            <p className="text-lg text-gray-600">
              I'll help you understand "{fileName}" better
            </p>
            <p className="text-sm text-gray-500">
              From {courseName}
            </p>
          </div>

          <div className="bg-white/80 rounded-lg p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">What I'll do for you:</h2>
            <ul className="space-y-3 text-left max-w-md mx-auto">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Break down complex concepts into simple explanations</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Add helpful examples you can relate to</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Highlight the most important points</span>
              </li>
            </ul>
          </div>

          <Button
            onClick={handleStart}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg font-semibold"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Learning
          </Button>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Friendly Progress Header */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-semibold text-gray-900">
                {isStreaming ? (isPaused ? 'Paused' : 'Creating your study guide...') : 'Ready to continue!'}
              </p>
              <p className="text-sm text-gray-600">
                Section {currentSection} of {totalSections}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isStreaming && (
              <>
                {isPaused ? (
                  <Button
                    onClick={onResume}
                    size="sm"
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Resume
                  </Button>
                ) : (
                  <Button
                    onClick={onPause}
                    size="sm"
                    variant="secondary"
                  >
                    <Pause className="w-4 h-4 mr-1" />
                    Pause
                  </Button>
                )}
                <Button
                  onClick={onSkipSection}
                  size="sm"
                  variant="outline"
                  className="text-gray-600"
                >
                  Skip Section
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-blue-100 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1 text-center">
            {Math.round(progress)}% complete
          </p>
        </div>
      </Card>

      {/* Success Message */}
      {!isStreaming && progress === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-6"
        >
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Great job! 🎉
          </h2>
          <p className="text-gray-600">
            Your personalized study guide is ready. Happy learning!
          </p>
        </motion.div>
      )}
    </div>
  );
}