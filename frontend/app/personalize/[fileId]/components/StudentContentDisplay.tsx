'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Lightbulb, RefreshCw, Bookmark, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Section {
  id: string;
  title: string;
  content: string;
  isComplete: boolean;
  isActive: boolean;
}

interface StudentContentDisplayProps {
  sections: Section[];
  onRegenerateSection: (sectionId: string) => void;
  onBookmarkSection: (sectionId: string) => void;
}

export function StudentContentDisplay({
  sections,
  onRegenerateSection,
  onBookmarkSection
}: StudentContentDisplayProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [bookmarkedSections, setBookmarkedSections] = useState<Set<string>>(new Set());

  const handleCopy = async (sectionId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedSection(sectionId);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleBookmark = (sectionId: string) => {
    const newBookmarks = new Set(bookmarkedSections);
    if (newBookmarks.has(sectionId)) {
      newBookmarks.delete(sectionId);
      toast.success('Bookmark removed');
    } else {
      newBookmarks.add(sectionId);
      toast.success('Section bookmarked!');
    }
    setBookmarkedSections(newBookmarks);
    onBookmarkSection(sectionId);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {sections.map((section, index) => (
        <motion.div
          key={section.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card 
            className={cn(
              "relative overflow-hidden transition-all duration-300",
              section.isActive && "ring-2 ring-blue-500 shadow-lg",
              section.isComplete && "bg-gradient-to-r from-green-50 to-emerald-50"
            )}
          >
            {/* Section Header */}
            <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold",
                    section.isComplete ? "bg-green-500" : section.isActive ? "bg-blue-500" : "bg-gray-400"
                  )}>
                    {section.isComplete ? <CheckCircle className="w-5 h-5" /> : index + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleBookmark(section.id)}
                    className={cn(
                      "hover:bg-yellow-50",
                      bookmarkedSections.has(section.id) && "text-yellow-600"
                    )}
                  >
                    <Bookmark className={cn(
                      "w-4 h-4",
                      bookmarkedSections.has(section.id) && "fill-current"
                    )} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopy(section.id, section.content)}
                  >
                    {copiedSection === section.id ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  {section.isComplete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRegenerateSection(section.id)}
                      className="hover:bg-blue-50"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6">
              {section.isActive && !section.content ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <p className="text-gray-600">Creating your personalized explanation...</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  </div>
                </div>
              ) : section.content ? (
                <div className="prose prose-lg max-w-none">
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 italic">
                  Waiting to start...
                </div>
              )}

              {/* Helpful Tips */}
              {section.isComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200"
                >
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-yellow-900">Quick tip:</p>
                      <p className="text-sm text-yellow-800">
                        Not quite right? Click the refresh button to get a different explanation!
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Progress Indicator */}
            {section.isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                <motion.div
                  className="h-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 10, ease: "linear" }}
                />
              </div>
            )}
          </Card>
        </motion.div>
      ))}
    </div>
  );
}