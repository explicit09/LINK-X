'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, FileText, Lightbulb, BarChart, Clock, Trophy } from 'lucide-react';

interface ContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
}

export function ContextPanel({ isOpen, onClose, fileId }: ContextPanelProps) {
  // Mock data for demonstration
  const keyInsights = [
    'Neural networks consist of interconnected layers',
    'Backpropagation is key to training',
    'Activation functions introduce non-linearity',
  ];
  
  const stats = {
    timeSpent: '12:34',
    xpEarned: 250,
    sectionsCompleted: 3,
    totalSections: 5,
  };
  
  if (!isOpen) return null;
  
  return (
    <div className={cn(
      "fixed right-0 top-14 bottom-14 w-80 bg-white border-l border-gray-200",
      "shadow-lg overflow-y-auto z-40 transition-transform duration-300",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Context</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Original PDF Section */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Original PDF
          </h3>
          <Card className="p-3 bg-gray-50">
            <div className="aspect-[3/4] bg-gray-200 rounded flex items-center justify-center text-gray-500">
              <FileText className="h-12 w-12" />
            </div>
            <Button variant="link" size="sm" className="mt-2 w-full">
              View Full Document
            </Button>
          </Card>
        </div>
        
        {/* Key Insights */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Key Insights
          </h3>
          <ul className="space-y-2">
            {keyInsights.map((insight, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Your Progress */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Your Progress
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Time</span>
              </div>
              <span className="font-mono text-sm font-medium">{stats.timeSpent}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Trophy className="h-4 w-4" />
                <span>XP Earned</span>
              </div>
              <span className="text-sm font-medium text-green-600">+{stats.xpEarned}</span>
            </div>
            
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Sections</span>
                <span>{stats.sectionsCompleted}/{stats.totalSections}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${(stats.sectionsCompleted / stats.totalSections) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Personal Notes */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Personal Notes</h3>
          <Card className="p-3">
            <textarea
              placeholder="Add your notes here..."
              className="w-full min-h-[100px] text-sm resize-none border-0 focus:outline-none"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}