import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  CheckCircle2,
  Circle,
  Clock,
  Target,
  Zap,
  BookOpen,
  Lightbulb,
  Brain,
  Trophy,
  Flame,
  Star,
  ChevronRight,
  RotateCw
} from 'lucide-react';

interface OutlineSection {
  anchor: string;
  title: string;
  isComplete: boolean;
  order: number;
  content_preview?: string;
}

interface EnhancedOutlineProps {
  outline: OutlineSection[];
  progress: number;
  currentSection: string | null;
  isStreaming: boolean;
  onNavigate?: (sectionId: string) => void;
  onStart?: () => void;
  onPause?: () => void;
  className?: string;
}

// Gamification calculations
const calculateXP = (completedSections: number): number => {
  return completedSections * 50; // 50 XP per section
};

const calculateLevel = (xp: number): number => {
  return Math.floor(xp / 200) + 1; // Level up every 200 XP
};

const getNextLevelXP = (level: number): number => {
  return level * 200;
};

const getBadges = (outline: OutlineSection[], isComplete: boolean) => {
  const completed = outline.filter(s => s.isComplete).length;
  const total = outline.length;
  const badges = [];

  if (completed >= 1) badges.push({ name: 'First Steps', icon: '🎯', color: 'bg-blue-100 text-blue-700' });
  if (completed >= total * 0.5) badges.push({ name: 'Halfway Hero', icon: '🔥', color: 'bg-orange-100 text-orange-700' });
  if (completed >= total * 0.75) badges.push({ name: 'Almost There', icon: '⭐', color: 'bg-yellow-100 text-yellow-700' });
  if (isComplete) badges.push({ name: 'Master Learner', icon: '🏆', color: 'bg-green-100 text-green-700' });
  
  return badges;
};

// Content type detection for icons
const getContentTypeIcon = (title: string, preview: string = '') => {
  const combined = (title + ' ' + preview).toLowerCase();
  
  if (combined.includes('example') || combined.includes('for instance')) {
    return <Lightbulb className="w-4 h-4 text-yellow-500" />;
  }
  if (combined.includes('practice') || combined.includes('exercise')) {
    return <Target className="w-4 h-4 text-green-500" />;
  }
  if (combined.includes('summary') || combined.includes('conclusion')) {
    return <Brain className="w-4 h-4 text-purple-500" />;
  }
  return <BookOpen className="w-4 h-4 text-blue-500" />;
};

export function EnhancedOutline({
  outline,
  progress,
  currentSection,
  isStreaming,
  onNavigate,
  onStart,
  onPause,
  className
}: EnhancedOutlineProps) {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [streakCount, setStreakCount] = useState(0);
  
  const completedSections = outline?.filter(s => s.isComplete).length || 0;
  const totalSections = outline?.length || 0;
  const isComplete = progress === 100;
  const xp = calculateXP(completedSections);
  const level = calculateLevel(xp);
  const nextLevelXP = getNextLevelXP(level);
  const currentLevelProgress = ((xp % 200) / 200) * 100;
  const badges = getBadges(outline, isComplete);

  // Update streak when sections are completed
  useEffect(() => {
    if (completedSections > streakCount) {
      setStreakCount(completedSections);
    }
  }, [completedSections]);

  const handleSectionClick = (sectionId: string) => {
    if (onNavigate) {
      onNavigate(sectionId);
    }
  };

  const renderSectionItem = (section: OutlineSection, index: number) => {
    const isActive = currentSection === section.anchor;
    const isHovered = hoveredSection === section.anchor;
    const canNavigate = section.isComplete || !isStreaming;

    return (
      <div
        key={section.anchor}
        className={cn(
          "group relative p-3 rounded-lg border transition-all duration-200 cursor-pointer",
          isActive && "bg-primary/10 border-primary/30 shadow-md scale-[1.02]",
          isHovered && !isActive && "bg-muted/50 border-border shadow-sm",
          !isActive && !isHovered && "border-border/30 hover:border-border",
          section.isComplete && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
          !canNavigate && "opacity-60 cursor-not-allowed"
        )}
        onClick={() => canNavigate && handleSectionClick(section.anchor)}
        onMouseEnter={() => setHoveredSection(section.anchor)}
        onMouseLeave={() => setHoveredSection(null)}
      >
        <div className="flex items-start gap-3">
          {/* Section Status Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {section.isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : isActive && isStreaming ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground" />
            )}
          </div>

          {/* Section Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getContentTypeIcon(section.title, section.content_preview)}
              <span className="text-xs font-medium text-muted-foreground">
                Section {index + 1}
              </span>
            </div>
            
            <h4 className={cn(
              "text-sm font-medium leading-tight mb-1 line-clamp-2",
              isActive ? "text-primary" : "text-foreground",
              section.isComplete && "text-green-700 dark:text-green-300"
            )}>
              {section.title.replace(/^Part\s+\d+$/i, `Part ${index + 1}: Learning Module`)}
            </h4>
            
            {section.content_preview && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {section.content_preview.slice(0, 80)}...
              </p>
            )}

            {/* Section Progress */}
            <div className="flex items-center gap-2">
              <Progress 
                value={section.isComplete ? 100 : (isActive && isStreaming ? 50 : 0)}
                className="h-1.5 flex-1"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {section.isComplete ? 'Done' : isActive && isStreaming ? 'Loading...' : 'Pending'}
              </span>
            </div>
          </div>

          {/* Navigation Arrow */}
          {canNavigate && (
            <ChevronRight className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              (isActive || isHovered) && "text-primary transform translate-x-1"
            )} />
          )}
        </div>

        {/* Active Section Indicator */}
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-sm" />
        )}
      </div>
    );
  };

  return (
    <Card className={cn("p-4 h-fit sticky top-4", className)}>
      {/* Header with Level & XP */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Learning Progress</h3>
          <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
            Level {level}
          </Badge>
        </div>
        
        {/* XP Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Experience Points</span>
            <span className="font-medium">{xp} / {nextLevelXP} XP</span>
          </div>
          <Progress value={currentLevelProgress} className="h-2" />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-lg font-bold text-primary">{completedSections}</div>
          <div className="text-xs text-muted-foreground">Completed</div>
        </div>
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-lg font-bold text-orange-500">{Math.round(progress)}%</div>
          <div className="text-xs text-muted-foreground">Progress</div>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Achievements
          </h4>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge, index) => (
              <Badge 
                key={index}
                className={cn(badge.color, "text-xs animate-in slide-in-from-bottom duration-500")}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {badge.icon} {badge.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Streak Counter */}
      {streakCount > 0 && (
        <div className="mb-6 p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium">
              {streakCount} Section{streakCount !== 1 ? 's' : ''} Streak! 
            </span>
            <span className="text-lg">🔥</span>
          </div>
        </div>
      )}

      {/* Main Control Button */}
      <div className="mb-6">
        {!isStreaming && progress === 0 ? (
          <Button onClick={onStart} className="w-full" size="lg">
            <Play className="w-4 h-4 mr-2" />
            Start Learning
          </Button>
        ) : isStreaming ? (
          <Button onClick={onPause} variant="outline" className="w-full" size="lg">
            <Pause className="w-4 h-4 mr-2" />
            Pause Learning
          </Button>
        ) : progress > 0 && progress < 100 ? (
          <Button onClick={onStart} className="w-full" size="lg">
            <RotateCw className="w-4 h-4 mr-2" />
            Continue Learning
          </Button>
        ) : (
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-sm font-medium text-green-700 dark:text-green-300">
              Learning Complete!
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
              Great job mastering this content! 🎉
            </div>
          </div>
        )}
      </div>

      {/* Sections List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Content Sections
        </h4>
        
        <ScrollArea className="max-h-96">
          <div className="space-y-2 pr-2">
            {outline.map((section, index) => renderSectionItem(section, index))}
          </div>
        </ScrollArea>
      </div>

      {/* Footer Stats */}
      {isComplete && (
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">
              Session Complete
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {xp} XP Earned
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Level {level} Achieved
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}