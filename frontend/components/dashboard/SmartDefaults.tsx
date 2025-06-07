'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles,
  Check,
  X,
  Calendar,
  Target,
  Clock,
  Bell,
  BookOpen,
  ArrowRight,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserBehavior, SmartDefault } from '@/hooks/useUserBehavior';
import { FadeInCard, AnimatedNumber } from '@/components/dashboard/animations/CSSAnimations';
import { toast } from 'sonner';

interface SmartDefaultsManagerProps {
  onApplyDefault?: (defaultConfig: SmartDefault) => void;
  className?: string;
}

export function SmartDefaultsManager({ onApplyDefault, className }: SmartDefaultsManagerProps) {
  const { smartDefaults, behaviorPattern, isAnalyzing } = useUserBehavior();
  const [appliedDefaults, setAppliedDefaults] = useState<string[]>([]);
  const [expandedDefault, setExpandedDefault] = useState<string | null>(null);

  // Auto-apply high confidence defaults
  useEffect(() => {
    if (!smartDefaults) return;

    smartDefaults.forEach(def => {
      if (def.confidence >= 0.9 && !appliedDefaults.includes(def.id)) {
        // Auto-apply very high confidence defaults
        handleApplyDefault(def, true);
      }
    });
  }, [smartDefaults]);

  const handleApplyDefault = (smartDefault: SmartDefault, isAuto = false) => {
    if (onApplyDefault) {
      onApplyDefault(smartDefault);
    }
    
    setAppliedDefaults(prev => [...prev, smartDefault.id]);
    
    toast.success(
      isAuto ? `Auto-applied: ${smartDefault.reason}` : `Applied: ${smartDefault.reason}`,
      {
        icon: isAuto ? '🤖' : '✅',
        duration: 3000
      }
    );
  };

  const getDefaultIcon = (type: SmartDefault['type']) => {
    switch (type) {
      case 'schedule':
        return <Calendar className="w-5 h-5" />;
      case 'goal':
        return <Target className="w-5 h-5" />;
      case 'reminder':
        return <Bell className="w-5 h-5" />;
      case 'suggestion':
        return <BookOpen className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const getDefaultColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100 border-green-200';
    if (confidence >= 0.6) return 'text-blue-600 bg-blue-100 border-blue-200';
    return 'text-gray-600 bg-gray-100 border-gray-200';
  };

  if (isAnalyzing) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="space-y-3">
            <Sparkles className="w-8 h-8 text-purple-600 mx-auto animate-pulse" />
            <p className="text-sm text-muted-foreground">
              Analyzing your learning patterns...
            </p>
            <Progress value={33} className="w-32 mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!smartDefaults || smartDefaults.length === 0) return null;

  return (
    <FadeInCard delay={0.2}>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Smart Defaults
            <Badge variant="secondary" className="ml-2">
              {smartDefaults.filter(d => !appliedDefaults.includes(d.id)).length} Available
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Personalized settings based on your learning patterns
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {smartDefaults.map((smartDefault, index) => {
            const isApplied = appliedDefaults.includes(smartDefault.id);
            const isExpanded = expandedDefault === smartDefault.id;
            
            return (
              <FadeInCard key={smartDefault.id} delay={index * 0.1}>
                <div
                  className={cn(
                    'p-4 rounded-lg border transition-all duration-200',
                    getDefaultColor(smartDefault.confidence),
                    isApplied && 'opacity-60',
                    !isApplied && 'hover:shadow-md cursor-pointer'
                  )}
                  onClick={() => !isApplied && setExpandedDefault(isExpanded ? null : smartDefault.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="p-2 rounded-full bg-white flex-shrink-0">
                      {getDefaultIcon(smartDefault.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm capitalize mb-1">
                            Smart {smartDefault.type}
                          </h4>
                          
                          <p className="text-sm opacity-90">
                            {smartDefault.reason}
                          </p>

                          {/* Expanded details */}
                          {isExpanded && !isApplied && (
                            <div className="mt-3 space-y-2">
                              <SmartDefaultDetails 
                                smartDefault={smartDefault} 
                                behaviorPattern={behaviorPattern}
                              />
                              
                              <div className="flex items-center gap-2 pt-2">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApplyDefault(smartDefault);
                                  }}
                                >
                                  Apply This Setting
                                  <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedDefault(null);
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Status/Action */}
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {Math.round(smartDefault.confidence * 100)}% match
                          </Badge>
                          {isApplied ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Info className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeInCard>
            );
          })}

          {/* Apply all button */}
          {smartDefaults.filter(d => !appliedDefaults.includes(d.id)).length > 1 && (
            <div className="pt-3 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  smartDefaults.forEach(def => {
                    if (!appliedDefaults.includes(def.id)) {
                      handleApplyDefault(def);
                    }
                  });
                }}
              >
                Apply All Recommendations
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </FadeInCard>
  );
}

interface SmartDefaultDetailsProps {
  smartDefault: SmartDefault;
  behaviorPattern: any;
}

function SmartDefaultDetails({ smartDefault, behaviorPattern }: SmartDefaultDetailsProps) {
  switch (smartDefault.type) {
    case 'schedule':
      return (
        <div className="bg-white/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Optimal Time:</span>
            <span className="font-medium">{smartDefault.value.hour}:00</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Session Length:</span>
            <span className="font-medium">{smartDefault.value.duration} minutes</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Best Days:</span>
            <span className="font-medium">{smartDefault.value.days.join(', ')}</span>
          </div>
        </div>
      );

    case 'goal':
      return (
        <div className="bg-white/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Weekly XP Target:</span>
            <span className="font-medium">
              <AnimatedNumber value={smartDefault.value.weekly_xp} duration={0.5} /> XP
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Daily Sessions:</span>
            <span className="font-medium">{smartDefault.value.daily_sessions} sessions</span>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            10% stretch from your current average
          </div>
        </div>
      );

    case 'reminder':
      return (
        <div className="bg-white/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Reminder Time:</span>
            <span className="font-medium">{smartDefault.value.time}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Active Days:</span>
            <span className="font-medium">{smartDefault.value.days.length} days/week</span>
          </div>
          <div className="text-sm bg-blue-50 text-blue-700 p-2 rounded mt-2">
            "{smartDefault.value.message}"
          </div>
        </div>
      );

    case 'suggestion':
      return (
        <div className="bg-white/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Preferred Subjects:</span>
            <span className="font-medium">{smartDefault.value.subjects.join(', ')}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Content Type:</span>
            <span className="font-medium capitalize">{smartDefault.value.contentType}</span>
          </div>
        </div>
      );

    default:
      return null;
  }
}

// Inline smart default widget for forms
export function SmartDefaultInput({ 
  type, 
  onApply, 
  className 
}: { 
  type: SmartDefault['type']; 
  onApply: (value: any) => void;
  className?: string;
}) {
  const { smartDefaults } = useUserBehavior();
  const relevantDefault = smartDefaults?.find(d => d.type === type);

  if (!relevantDefault || relevantDefault.confidence < 0.6) return null;

  return (
    <div className={cn('flex items-center gap-2 p-2 bg-blue-50 rounded-lg', className)}>
      <Sparkles className="w-4 h-4 text-blue-600" />
      <span className="text-sm text-blue-700 flex-1">
        Suggested: {relevantDefault.reason}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="text-blue-700 hover:text-blue-800"
        onClick={() => onApply(relevantDefault.value)}
      >
        Use
        <ArrowRight className="w-3 h-3 ml-1" />
      </Button>
    </div>
  );
}