import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Download, 
  Save, 
  Share2, 
  Clock, 
  Target, 
  Zap, 
  Trophy,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Star,
  TrendingUp,
  Brain
} from 'lucide-react';

interface EnhancedMinimalHeaderProps {
  title: string;
  subtitle?: string;
  progress: number;
  isStreaming: boolean;
  completedSections: number;
  totalSections: number;
  estimatedReadTime?: number;
  xpEarned?: number;
  onBack?: () => void;
  onDownload?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  className?: string;
}

// Show subtle celebration toast instead of disruptive overlay
const showCelebrationToast = (milestone: string) => {
  toast.success(`🎉 ${milestone}!`, {
    description: "Keep up the great work!",
    duration: 2000,
  });
};

export function EnhancedMinimalHeader({
  title,
  subtitle,
  progress,
  isStreaming,
  completedSections,
  totalSections,
  estimatedReadTime = 0,
  xpEarned = 0,
  onBack,
  onDownload,
  onSave,
  onShare,
  className
}: EnhancedMinimalHeaderProps) {
  const [lastProgress, setLastProgress] = useState(0);

  // Trigger subtle celebrations on milestones
  useEffect(() => {
    if (progress > lastProgress) {
      if (progress >= 25 && lastProgress < 25) {
        showCelebrationToast("Quarter Complete");
      } else if (progress >= 50 && lastProgress < 50) {
        showCelebrationToast("Halfway There");
      } else if (progress >= 75 && lastProgress < 75) {
        showCelebrationToast("Almost Done");
      } else if (progress >= 100 && lastProgress < 100) {
        showCelebrationToast("Learning Complete");
      }
      setLastProgress(progress);
    }
  }, [progress, lastProgress]);

  const getProgressColor = (progress: number) => {
    if (progress < 25) return "bg-red-500";
    if (progress < 50) return "bg-yellow-500";
    if (progress < 75) return "bg-blue-500";
    return "bg-green-500";
  };

  const getProgressMessage = (progress: number) => {
    if (progress === 0) return "Ready to start your personalized learning journey";
    if (progress < 25) return "Getting started - building momentum";
    if (progress < 50) return "Making great progress - keep going!";
    if (progress < 75) return "More than halfway there - you're doing amazing!";
    if (progress < 100) return "Almost finished - final stretch!";
    return "Congratulations! You've mastered this content 🎉";
  };

  const level = Math.floor(xpEarned / 200) + 1;
  const nextLevelXP = level * 200;
  const progressToNextLevel = ((xpEarned % 200) / 200) * 100;

  return (
    <>
      <div className={cn(
        "sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/50",
        className
      )}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Main Header Content */}
          <div className="flex items-start justify-between gap-4 mb-4">
            {/* Left: Title and Navigation */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              {onBack && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onBack}
                  className="flex-shrink-0 mt-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-foreground mb-1 truncate">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {subtitle}
                  </p>
                )}
                
                {/* Progress Message */}
                <div className="flex items-center gap-2 mt-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {getProgressMessage(progress)}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {progress === 100 && (
                <>
                  {onSave && (
                    <Button variant="outline" size="sm" onClick={onSave}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  )}
                  {onDownload && (
                    <Button variant="outline" size="sm" onClick={onDownload}>
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  )}
                  {onShare && (
                    <Button variant="outline" size="sm" onClick={onShare}>
                      <Share2 className="w-4 h-4 mr-1" />
                      Share
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            {/* Progress */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Progress</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {Math.round(progress)}%
              </div>
            </div>

            {/* Sections */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Sections</span>
              </div>
              <div className="text-lg font-semibold">
                <span className="text-green-600">{completedSections}</span>
                <span className="text-muted-foreground">/{totalSections}</span>
              </div>
            </div>

            {/* Reading Time */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium">Time</span>
              </div>
              <div className="text-lg font-semibold text-orange-600">
                {estimatedReadTime}m
              </div>
            </div>

            {/* XP & Level */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">Level</span>
              </div>
              <div className="text-lg font-semibold">
                <span className="text-purple-600">L{level}</span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({xpEarned} XP)
                </span>
              </div>
            </div>

            {/* Streaming Status */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Brain className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium">Status</span>
              </div>
              <div className="flex items-center gap-1">
                {isStreaming ? (
                  <>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-emerald-600">
                      AI Working
                    </span>
                  </>
                ) : progress === 100 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">
                      Complete
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Ready
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Overall Progress
              </span>
              <span className="font-medium">
                {completedSections}/{totalSections} sections
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={progress} 
                className="h-3"
              />
              {isStreaming && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse rounded-full" />
              )}
            </div>
            
            {/* XP Progress to Next Level */}
            {xpEarned > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Progress to Level {level + 1}
                  </span>
                  <span className="font-medium">
                    {xpEarned % 200}/{200} XP
                  </span>
                </div>
                <Progress 
                  value={progressToNextLevel} 
                  className="h-1.5"
                />
              </div>
            )}
          </div>

          {/* Achievement Badges Row */}
          {progress > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm font-medium text-muted-foreground">Achievements:</span>
              <div className="flex gap-2">
                {progress >= 25 && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                    🎯 Started
                  </Badge>
                )}
                {progress >= 50 && (
                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                    🔥 Halfway
                  </Badge>
                )}
                {progress >= 75 && (
                  <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
                    ⭐ Almost There
                  </Badge>
                )}
                {progress >= 100 && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                    🏆 Master
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

    </>
  );
}