'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  HelpCircle, 
  X, 
  ChevronRight, 
  Lightbulb,
  Info,
  CheckCircle 
} from 'lucide-react';

interface HelpTooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  showOnFirstVisit?: boolean;
  helpId?: string; // For tracking which tips have been seen
}

export function HelpTooltip({ 
  content, 
  children, 
  side = 'top',
  showOnFirstVisit = false,
  helpId
}: HelpTooltipProps) {
  const [hasBeenSeen, setHasBeenSeen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (helpId && typeof window !== 'undefined') {
      const seenHelps = JSON.parse(localStorage.getItem('seen_help_tips') || '[]');
      if (seenHelps.includes(helpId)) {
        setHasBeenSeen(true);
      } else if (showOnFirstVisit) {
        setIsOpen(true);
        // Auto-close after 5 seconds
        const timer = setTimeout(() => setIsOpen(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [helpId, showOnFirstVisit]);

  const markAsSeen = () => {
    if (helpId && !hasBeenSeen && typeof window !== 'undefined') {
      const seenHelps = JSON.parse(localStorage.getItem('seen_help_tips') || '[]');
      seenHelps.push(helpId);
      localStorage.setItem('seen_help_tips', JSON.stringify(seenHelps));
      setHasBeenSeen(true);
    }
    setIsOpen(false);
  };

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) markAsSeen();
      }}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{content}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface InteractiveGuideProps {
  steps: {
    target: string; // CSS selector for target element
    title: string;
    content: string;
    position?: 'top' | 'right' | 'bottom' | 'left';
  }[];
  onComplete?: () => void;
  guideId: string;
}

export function InteractiveGuide({ steps, onComplete, guideId }: InteractiveGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Check if guide has been completed
    if (typeof window !== 'undefined') {
      const completedGuides = JSON.parse(localStorage.getItem('completed_guides') || '[]');
      if (!completedGuides.includes(guideId)) {
        setIsActive(true);
      }
    }
  }, [guideId]);

  useEffect(() => {
    if (isActive && steps[currentStep]) {
      const element = document.querySelector(steps[currentStep].target) as HTMLElement;
      if (element) {
        setTargetElement(element);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add highlight
        element.style.position = 'relative';
        element.style.zIndex = '1000';
        element.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5)';
        
        return () => {
          element.style.boxShadow = '';
          element.style.zIndex = '';
        };
      }
    }
  }, [currentStep, isActive, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeGuide();
    }
  };

  const handleSkip = () => {
    completeGuide();
  };

  const completeGuide = () => {
    if (typeof window !== 'undefined') {
      const completedGuides = JSON.parse(localStorage.getItem('completed_guides') || '[]');
      completedGuides.push(guideId);
      localStorage.setItem('completed_guides', JSON.stringify(completedGuides));
    }
    setIsActive(false);
    onComplete?.();
  };

  if (!isActive || !targetElement || !steps[currentStep]) return null;

  const step = steps[currentStep];
  const rect = targetElement.getBoundingClientRect();
  
  // Calculate popover position
  const position = {
    top: step.position === 'bottom' ? rect.bottom + 10 : rect.top - 10,
    left: step.position === 'right' ? rect.right + 10 : rect.left,
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleSkip}
      />
      
      {/* Guide Popover */}
      <div 
        className="fixed z-50"
        style={{ top: position.top, left: position.left }}
      >
        <Card className="w-80 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">{step.title}</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSkip}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-4">{step.content}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Step {currentStep + 1} of {steps.length}
              </span>
              <div className="space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSkip}
                >
                  Skip Tour
                </Button>
                <Button
                  size="sm"
                  onClick={handleNext}
                >
                  {currentStep < steps.length - 1 ? 'Next' : 'Finish'}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

interface SmartTipProps {
  tipId: string;
  title: string;
  content: string;
  actionLabel?: string;
  onAction?: () => void;
  trigger?: 'hover' | 'click' | 'auto';
  delay?: number; // For auto trigger
  icon?: React.ReactNode;
}

export function SmartTip({
  tipId,
  title,
  content,
  actionLabel,
  onAction,
  trigger = 'hover',
  delay = 3000,
  icon = <Lightbulb className="h-4 w-4" />
}: SmartTipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissedTips = JSON.parse(localStorage.getItem('dismissed_tips') || '[]');
      if (dismissedTips.includes(tipId)) {
        setIsDismissed(true);
        return;
      }
    }

    if (trigger === 'auto') {
      const timer = setTimeout(() => setIsOpen(true), delay);
      return () => clearTimeout(timer);
    }
  }, [tipId, trigger, delay]);

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      const dismissedTips = JSON.parse(localStorage.getItem('dismissed_tips') || '[]');
      dismissedTips.push(tipId);
      localStorage.setItem('dismissed_tips', JSON.stringify(dismissedTips));
    }
    setIsDismissed(true);
    setIsOpen(false);
  };

  const handleAction = () => {
    onAction?.();
    handleDismiss();
  };

  if (isDismissed) return null;

  const TriggerButton = (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      onClick={trigger === 'click' ? () => setIsOpen(!isOpen) : undefined}
      onMouseEnter={trigger === 'hover' ? () => setIsOpen(true) : undefined}
      onMouseLeave={trigger === 'hover' ? () => setIsOpen(false) : undefined}
    >
      <HelpCircle className="h-4 w-4 text-gray-400" />
    </Button>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {TriggerButton}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-full bg-blue-100 text-blue-600">
              {icon}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">{title}</h4>
              <p className="text-sm text-gray-600">{content}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-gray-500"
            >
              Dismiss
            </Button>
            {actionLabel && (
              <Button
                size="sm"
                onClick={handleAction}
              >
                {actionLabel}
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface FeatureHighlightProps {
  featureId: string;
  title: string;
  description: string;
  isNew?: boolean;
  children: React.ReactNode;
}

export function FeatureHighlight({
  featureId,
  title,
  description,
  isNew = false,
  children
}: FeatureHighlightProps) {
  const [showHighlight, setShowHighlight] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seenFeatures = JSON.parse(localStorage.getItem('seen_features') || '[]');
      if (!seenFeatures.includes(featureId) && isNew) {
        setShowHighlight(true);
      }
    }
  }, [featureId, isNew]);

  const markAsSeen = () => {
    if (typeof window !== 'undefined') {
      const seenFeatures = JSON.parse(localStorage.getItem('seen_features') || '[]');
      seenFeatures.push(featureId);
      localStorage.setItem('seen_features', JSON.stringify(seenFeatures));
    }
    setShowHighlight(false);
  };

  return (
    <div className="relative">
      {children}
      {showHighlight && (
        <div className="absolute -top-2 -right-2 z-10">
          <Popover>
            <PopoverTrigger asChild>
              <div className="relative">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">NEW</Badge>
                  <h4 className="font-semibold text-sm">{title}</h4>
                </div>
                <p className="text-sm text-gray-600">{description}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={markAsSeen}
                  className="w-full"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Got it
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}

// Hook for managing contextual help state
export function useContextualHelp() {
  const resetAllHelp = () => {
    localStorage.removeItem('seen_help_tips');
    localStorage.removeItem('completed_guides');
    localStorage.removeItem('dismissed_tips');
    localStorage.removeItem('seen_features');
  };

  const hasSeenHelp = (helpId: string) => {
    const seenHelps = JSON.parse(localStorage.getItem('seen_help_tips') || '[]');
    return seenHelps.includes(helpId);
  };

  const hasCompletedGuide = (guideId: string) => {
    const completedGuides = JSON.parse(localStorage.getItem('completed_guides') || '[]');
    return completedGuides.includes(guideId);
  };

  return {
    resetAllHelp,
    hasSeenHelp,
    hasCompletedGuide
  };
}