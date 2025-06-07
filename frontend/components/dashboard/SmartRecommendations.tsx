'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain,
  X,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
  Target,
  TrendingUp,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSmartRecommendations, SmartRecommendation } from '@/hooks/useSmartRecommendations';
import { FadeInCard, AnimatedNumber } from '@/components/dashboard/animations/CSSAnimations';

interface SmartRecommendationsProps {
  maxVisible?: number;
  showTitle?: boolean;
  className?: string;
}

export function SmartRecommendations({ 
  maxVisible = 3, 
  showTitle = true,
  className 
}: SmartRecommendationsProps) {
  const { recommendations, dismissRecommendation, hasUrgentRecommendations } = useSmartRecommendations();
  const [currentIndex, setCurrentIndex] = useState(0);

  if (recommendations.length === 0) return null;

  const visibleRecommendations = recommendations.slice(currentIndex, currentIndex + maxVisible);
  const hasMore = recommendations.length > maxVisible;

  const handleNext = () => {
    setCurrentIndex(prev => 
      prev + maxVisible >= recommendations.length ? 0 : prev + maxVisible
    );
  };

  const handlePrevious = () => {
    setCurrentIndex(prev => 
      prev === 0 ? Math.max(0, recommendations.length - maxVisible) : Math.max(0, prev - maxVisible)
    );
  };

  const getTypeIcon = (type: SmartRecommendation['type']) => {
    switch (type) {
      case 'action':
        return <Target className="w-4 h-4" />;
      case 'insight':
        return <Brain className="w-4 h-4" />;
      case 'goal':
        return <Award className="w-4 h-4" />;
      case 'tip':
        return <Sparkles className="w-4 h-4" />;
      case 'celebration':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: SmartRecommendation['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'low':
        return 'text-gray-600 bg-gray-100 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  return (
    <FadeInCard delay={0.3}>
      <Card className={cn('relative', className)}>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Smart Recommendations
                {hasUrgentRecommendations && (
                  <Badge variant="destructive" className="ml-2 animate-pulse">
                    Action Needed
                  </Badge>
                )}
              </div>
              {hasMore && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevious}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {currentIndex + 1}-{Math.min(currentIndex + maxVisible, recommendations.length)} of {recommendations.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNext}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
        )}
        
        <CardContent className={cn('space-y-3', !showTitle && 'pt-6')}>
          {visibleRecommendations.map((rec, index) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onDismiss={() => dismissRecommendation(rec.id)}
              delay={index * 0.1}
              getTypeIcon={getTypeIcon}
              getPriorityColor={getPriorityColor}
            />
          ))}
        </CardContent>
      </Card>
    </FadeInCard>
  );
}

interface RecommendationCardProps {
  recommendation: SmartRecommendation;
  onDismiss: () => void;
  delay: number;
  getTypeIcon: (type: SmartRecommendation['type']) => React.ReactNode;
  getPriorityColor: (priority: SmartRecommendation['priority']) => string;
}

function RecommendationCard({ 
  recommendation, 
  onDismiss, 
  delay,
  getTypeIcon,
  getPriorityColor
}: RecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isUrgent = recommendation.priority === 'urgent';

  return (
    <FadeInCard delay={delay}>
      <div
        className={cn(
          'relative p-4 rounded-lg border transition-all duration-200',
          getPriorityColor(recommendation.priority),
          isUrgent && 'animate-pulse',
          'hover:shadow-md cursor-pointer'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            'p-2 rounded-full flex-shrink-0',
            recommendation.color === 'yellow' && 'bg-yellow-100 text-yellow-600',
            recommendation.color === 'green' && 'bg-green-100 text-green-600',
            recommendation.color === 'blue' && 'bg-blue-100 text-blue-600',
            recommendation.color === 'purple' && 'bg-purple-100 text-purple-600',
            recommendation.color === 'orange' && 'bg-orange-100 text-orange-600',
          )}>
            <span className="text-lg">{recommendation.icon}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{recommendation.title}</h4>
                  <div className={cn(
                    'p-0.5 rounded',
                    recommendation.type === 'celebration' && 'bg-yellow-200'
                  )}>
                    {getTypeIcon(recommendation.type)}
                  </div>
                </div>
                
                {(isExpanded || recommendation.priority === 'urgent') && (
                  <p className="text-sm opacity-90 mb-3">
                    {recommendation.description}
                  </p>
                )}
                
                {/* Action button */}
                {recommendation.action && (isExpanded || isUrgent) && (
                  <Button
                    size="sm"
                    variant={isUrgent ? 'default' : 'outline'}
                    className="h-8 mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (recommendation.action?.url) {
                        window.location.href = recommendation.action.url;
                      } else if (recommendation.action?.callback) {
                        recommendation.action.callback();
                      }
                    }}
                  >
                    {recommendation.action.label}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>

              {/* Dismiss button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0 opacity-60 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>

            {/* Priority indicator */}
            {!isExpanded && recommendation.priority !== 'low' && (
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  variant={isUrgent ? 'destructive' : 'secondary'} 
                  className="text-xs"
                >
                  {recommendation.priority}
                </Badge>
                {recommendation.expiresAt && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>
                      Expires in {Math.ceil((recommendation.expiresAt.getTime() - Date.now()) / (1000 * 60))} min
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </FadeInCard>
  );
}

// Floating smart recommendation widget
export function FloatingSmartRecommendation() {
  const { topRecommendation, dismissRecommendation } = useSmartRecommendations();
  const [isMinimized, setIsMinimized] = useState(false);

  if (!topRecommendation || topRecommendation.priority === 'low') return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          size="icon"
          className="rounded-full shadow-lg bg-purple-600 hover:bg-purple-700"
          onClick={() => setIsMinimized(false)}
        >
          <Brain className="w-5 h-5" />
          {topRecommendation.priority === 'urgent' && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]">
      <Card className="shadow-2xl border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-sm">AI Recommendation</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsMinimized(true)}
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => dismissRecommendation(topRecommendation.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{topRecommendation.icon}</span>
              <div>
                <h4 className="font-semibold text-sm mb-1">
                  {topRecommendation.title}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {topRecommendation.description}
                </p>
              </div>
            </div>
            
            {topRecommendation.action && (
              <Button
                size="sm"
                className="w-full"
                variant={topRecommendation.priority === 'urgent' ? 'default' : 'secondary'}
                onClick={() => {
                  if (topRecommendation.action?.url) {
                    window.location.href = topRecommendation.action.url;
                  } else if (topRecommendation.action?.callback) {
                    topRecommendation.action.callback();
                  }
                }}
              >
                {topRecommendation.action.label}
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}