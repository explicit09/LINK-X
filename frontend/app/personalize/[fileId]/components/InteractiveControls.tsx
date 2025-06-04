'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Zap, 
  SlidersHorizontal,
  BookmarkPlus,
  Share2,
  MessageSquare,
  Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InteractiveControlsProps {
  isStreaming: boolean;
  isPaused: boolean;
  onPlayPause: () => void;
  onSkip: () => void;
  onSpeedChange: (speed: number) => void;
  onStyleChange: (style: string) => void;
  currentSpeed: number;
  currentStyle: string;
  progress: number;
  streakDays: number;
}

export function InteractiveControls({
  isStreaming,
  isPaused,
  onPlayPause,
  onSkip,
  onSpeedChange,
  onStyleChange,
  currentSpeed,
  currentStyle,
  progress,
  streakDays
}: InteractiveControlsProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const handleShare = (method: string) => {
    toast.success(`Shared via ${method}!`);
    setShowShareMenu(false);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'bookmark':
        toast.success('Added to bookmarks!');
        break;
      case 'notes':
        toast.success('Opening notes...');
        break;
      case 'discuss':
        toast.success('Opening discussion...');
        break;
    }
    setShowQuickActions(false);
  };

  return (
    <Card className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Main Controls */}
        <div className="flex items-center gap-3">
          <Button
            onClick={onPlayPause}
            size="lg"
            className={cn(
              "transition-all",
              isStreaming && !isPaused 
                ? "bg-orange-500 hover:bg-orange-600" 
                : "bg-green-500 hover:bg-green-600"
            )}
          >
            {isStreaming && !isPaused ? (
              <>
                <Pause className="w-5 h-5 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                {isStreaming ? 'Resume' : 'Start'}
              </>
            )}
          </Button>

          {isStreaming && (
            <Button
              onClick={onSkip}
              variant="secondary"
              size="lg"
            >
              <SkipForward className="w-5 h-5 mr-2" />
              Skip
            </Button>
          )}

          {/* Speed Control */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Zap className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium">Learning Speed</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Relaxed</span>
                    <span>Normal</span>
                    <span>Fast</span>
                  </div>
                  <Slider
                    value={[currentSpeed]}
                    onValueChange={([value]) => onSpeedChange(value)}
                    min={0.5}
                    max={2}
                    step={0.5}
                    className="w-full"
                  />
                  <p className="text-sm text-gray-600 text-center">
                    {currentSpeed}x speed
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Style Control */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium">Explanation Style</h4>
                <RadioGroup value={currentStyle} onValueChange={onStyleChange}>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="simple" id="simple" />
                      <Label htmlFor="simple">Simple & Clear</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="detailed" id="detailed" />
                      <Label htmlFor="detailed">Detailed & Thorough</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="examples" id="examples" />
                      <Label htmlFor="examples">Lots of Examples</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="visual" id="visual" />
                      <Label htmlFor="visual">Visual Descriptions</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Share */}
          <Popover open={showShareMenu} onOpenChange={setShowShareMenu}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Share2 className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleShare('Study Group')}
                >
                  Share with Study Group
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleShare('Email')}
                >
                  Email to Friend
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleShare('Link')}
                >
                  Copy Link
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Quick Actions Menu */}
          <Popover open={showQuickActions} onOpenChange={setShowQuickActions}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <BookmarkPlus className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleQuickAction('bookmark')}
                >
                  <BookmarkPlus className="w-4 h-4 mr-2" />
                  Add to Bookmarks
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleQuickAction('notes')}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Take Notes
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleQuickAction('discuss')}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Discuss with Class
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Streak Badge */}
          {streakDays > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 px-3 py-1 bg-yellow-100 rounded-full"
            >
              <Trophy className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-800">
                {streakDays} day streak!
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Progress Motivator */}
      {progress > 0 && progress < 100 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-center"
        >
          <p className="text-sm text-gray-600">
            {progress < 25 && "Great start! Keep going! 💪"}
            {progress >= 25 && progress < 50 && "You're doing amazing! 🌟"}
            {progress >= 50 && progress < 75 && "Over halfway there! 🚀"}
            {progress >= 75 && progress < 100 && "Almost done! You've got this! 🎯"}
          </p>
        </motion.div>
      )}
    </Card>
  );
}