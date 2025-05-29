"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { 
  Trophy,
  Target,
  Brain,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  BookOpen,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast as sonnerToast } from 'sonner';

// P0: Proper design system - single accent color + neutrals
const designSystem = {
  colors: {
    primary: '#4F46E5', // Single indigo accent
    success: '#10B981',
    warning: '#F59E0B', 
    error: '#EF4444',
    neutral: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563', // AAA compliant body text
      700: '#374151',
      800: '#1F2937',
      900: '#111827', // AAA compliant primary text
    }
  },
  typography: {
    h3: 'text-lg font-semibold text-gray-900',
    body: 'text-sm text-gray-700',
    small: 'text-xs text-gray-600',
    caption: 'text-xs text-gray-500',
  },
  spacing: {
    xs: 'p-2',
    sm: 'p-3', 
    md: 'p-4',
    lg: 'p-6',
  }
};

interface EnhancedSidebarProps {
  courseId: string;
  courseName: string;
  userStats?: {
    filesUploaded: number;
    weeksCompleted: number;
    studyStreak: number;
    aiQuestions: number;
    totalStudyTime: number;
    currentWeekProgress: number;
  };
  focusMode: boolean;
  onFocusModeToggle: (enabled: boolean) => void;
  className?: string;
  errors?: Array<{id: string, message: string, file?: string}>;
  onDismissError?: (id: string) => void;
}

// P0: Data validation - no more "NaN" or "Size unknown"
const validateAndFormatStats = (stats: any) => {
  const safeStats = {
    filesUploaded: Math.max(0, parseInt(stats?.filesUploaded) || 0),
    weeksCompleted: Math.max(0, parseInt(stats?.weeksCompleted) || 0),
    studyStreak: Math.max(0, parseInt(stats?.studyStreak) || 0),
    aiQuestions: Math.max(0, parseInt(stats?.aiQuestions) || 0),
    totalStudyTime: Math.max(0, parseInt(stats?.totalStudyTime) || 0),
    currentWeekProgress: Math.min(100, Math.max(0, parseFloat(stats?.currentWeekProgress) || 0)),
  };
  
  return safeStats;
};

const formatStudyTime = (minutes: number) => {
  if (!minutes || minutes < 1) return "0m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
};

// P1: Single neutral card style with status pills
const calculateBadges = (stats: any) => {
  const badges = [
    { 
      id: 'first-upload', 
      name: 'First Steps', 
      description: 'Upload your first file', 
      icon: '🎯', 
      unlocked: stats.filesUploaded > 0,
      requirement: 1
    },
    { 
      id: 'week-complete', 
      name: 'Week Warrior', 
      description: 'Complete a full week', 
      icon: '⚡', 
      unlocked: stats.weeksCompleted > 0,
      requirement: 1
    },
    { 
      id: 'streak-3', 
      name: 'On Fire', 
      description: '3-day study streak', 
      icon: '🔥', 
      unlocked: stats.studyStreak >= 3,
      requirement: 3
    },
    { 
      id: 'ai-master', 
      name: 'AI Whisperer', 
      description: 'Ask 10 AI questions', 
      icon: '🧠', 
      unlocked: stats.aiQuestions >= 10,
      requirement: 10
    },
  ];
  
  return {
    badges,
    unlockedCount: badges.filter(b => b.unlocked).length,
    totalBadges: badges.length,
  };
};

export function EnhancedSidebar({ 
  courseId, 
  courseName, 
  userStats,
  focusMode,
  onFocusModeToggle,
  className,
  errors = [],
  onDismissError
}: EnhancedSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false); // P1: Default collapsed
  
  // P0: Validate all data before render with proper defaults
  const validStats = validateAndFormatStats(userStats || {
    filesUploaded: 0,
    weeksCompleted: 0,
    studyStreak: 0,
    aiQuestions: 0,
    totalStudyTime: 0,
    currentWeekProgress: 0
  });
  const gamificationData = calculateBadges(validStats);

  const getNextGoal = () => {
    if (validStats.filesUploaded === 0) return "Upload your first file to get started";
    if (validStats.studyStreak < 3) return `Study ${3 - validStats.studyStreak} more days for "On Fire" badge`;
    if (validStats.aiQuestions < 10) return `Ask ${10 - validStats.aiQuestions} more AI questions for "AI Whisperer" badge`;
    return "All badges unlocked! Keep up the great work!";
  };

  return (
    <div className={cn(
      "w-80 bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
      focusMode && "translate-x-full opacity-0 pointer-events-none",
      className
    )}>
      {/* P2: Contextual error toast with click-through */}
      {errors.length > 0 && (
        <div className="p-4 border-b border-red-200 bg-red-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">
                {errors.length} upload error{errors.length > 1 ? 's' : ''}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => sonnerToast.info("Error details", {
                description: errors.map(e => `${e.file || 'File'}: ${e.message}`).join('\n')
              })}
              className="text-red-600 hover:text-red-700 hover:bg-red-100"
            >
              View Details
            </Button>
          </div>
          <div className="space-y-1">
            {errors.slice(0, 2).map((error) => (
              <div key={error.id} className="flex items-center justify-between text-xs text-red-600">
                <span className="truncate">{error.file || 'Unknown file'}: {error.message}</span>
                {onDismissError && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDismissError(error.id)}
                    className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Focus Mode Toggle */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-gray-600" />
            <span className={designSystem.typography.h3}>
              {courseName}
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFocusModeToggle(!focusMode)}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            {focusMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Switch
            checked={focusMode}
            onCheckedChange={onFocusModeToggle}
            className="data-[state=checked]:bg-indigo-600"
          />
          <span className={designSystem.typography.small}>
            Focus Mode
          </span>
        </div>
      </div>

      {/* P1: Clean progress overview */}
      <div className="p-4 border-b border-gray-100">
        <h3 className={cn(designSystem.typography.h3, "mb-3")}>
          Your Progress
        </h3>
        
        <div className="space-y-3">
          {/* Current Week Progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={designSystem.typography.small}>
                This Week
              </span>
              <span className={cn(designSystem.typography.small, "font-medium text-gray-900")}>
                {Math.round(validStats.currentWeekProgress)}%
              </span>
            </div>
            <Progress value={validStats.currentWeekProgress} className="h-2" />
          </div>
          
          {/* P1: Single neutral card style with colored status pills */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
              <Clock className="h-5 w-5 text-gray-600 mx-auto mb-1" />
              <div className={cn(designSystem.typography.body, "font-semibold text-gray-900")}>
                {formatStudyTime(validStats.totalStudyTime)}
              </div>
              <div className={designSystem.typography.caption}>
                Study Time
              </div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
              <TrendingUp className="h-5 w-5 text-gray-600 mx-auto mb-1" />
              <div className={cn(designSystem.typography.body, "font-semibold text-gray-900")}>
                {validStats.studyStreak}
              </div>
              <div className={designSystem.typography.caption}>
                Day Streak
              </div>
              {validStats.studyStreak >= 3 && (
                <Badge className="mt-1 text-xs bg-green-100 text-green-700 border-green-200">
                  On Fire!
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* P1: Collapsible achievements - default closed */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className={designSystem.typography.h3}>
              Achievements
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          
          {/* Always show progress summary */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-gray-600" />
              <span className={cn(designSystem.typography.body, "font-medium text-gray-900")}>
                {gamificationData.unlockedCount}/{gamificationData.totalBadges} Unlocked
              </span>
            </div>
            <Progress 
              value={(gamificationData.unlockedCount / gamificationData.totalBadges) * 100} 
              className="h-2"
            />
          </div>
          
          {isExpanded && (
            <div className="space-y-3">
              {/* P1: Single neutral card style */}
              <div className="grid grid-cols-2 gap-2">
                {gamificationData.badges.map((badge) => (
                  <Card
                    key={badge.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:scale-105 bg-white border border-gray-200",
                      badge.unlocked && "ring-2 ring-green-200"
                    )}
                    onClick={() => {
                      if (badge.unlocked) {
                        sonnerToast.success(`${badge.icon} ${badge.name}`, {
                          description: badge.description
                        });
                      } else {
                        sonnerToast.info(`${badge.icon} ${badge.name}`, {
                          description: `${badge.description} (${badge.requirement - (
                            badge.id === 'first-upload' ? validStats.filesUploaded :
                            badge.id === 'week-complete' ? validStats.weeksCompleted :
                            badge.id === 'streak-3' ? validStats.studyStreak :
                            validStats.aiQuestions
                          )} more needed)`
                        });
                      }
                    }}
                  >
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl mb-1">
                        {badge.icon}
                      </div>
                      <div className={cn(
                        designSystem.typography.caption,
                        "font-medium mb-1",
                        badge.unlocked ? "text-gray-900" : "text-gray-500"
                      )}>
                        {badge.name}
                      </div>
                      <div className={cn(
                        "text-center leading-tight",
                        badge.unlocked ? "text-gray-600" : "text-gray-400"
                      )}
                      style={{ fontSize: '10px', lineHeight: '1.2' }}>
                        {badge.description}
                      </div>
                      {badge.unlocked && (
                        <Badge className="mt-1 text-xs bg-green-100 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Unlocked
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Next Goal */}
              <Card className="bg-indigo-50 border-indigo-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-indigo-600" />
                    <span className={cn(designSystem.typography.small, "font-medium text-indigo-700")}>
                      Next Goal
                    </span>
                  </div>
                  <p className={cn(designSystem.typography.caption, "text-indigo-600")}>
                    {getNextGoal()}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-gray-100">
        <div className="space-y-2">
          <Button 
            className="w-full justify-start bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => sonnerToast.info("Opening AI chat...")}
          >
            <Brain className="h-4 w-4 mr-2" />
            Ask AI Tutor
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={() => sonnerToast.info("Opening study session...")}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Start Study Session
          </Button>
        </div>
      </div>
    </div>
  );
} 