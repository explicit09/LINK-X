'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles,
  ArrowRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContextualTip } from '@/hooks/useContextualHelp';

interface ContextualHelpProps {
  tips: ContextualTip[];
  onDismiss: (tipId: string) => void;
  onAction?: (tip: ContextualTip) => void;
  className?: string;
  maxTips?: number;
}

export function ContextualHelp({ 
  tips, 
  onDismiss, 
  onAction, 
  className, 
  maxTips = 3 
}: ContextualHelpProps) {
  if (tips.length === 0) return null;

  const displayTips = tips
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })
    .slice(0, maxTips);

  const getTypeIcon = (type: ContextualTip['type']) => {
    switch (type) {
      case 'info':
        return <Info className="w-4 h-4" />;
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'celebration':
        return <Sparkles className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getTypeClasses = (type: ContextualTip['type']) => {
    switch (type) {
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'celebration':
        return 'border-purple-200 bg-purple-50 text-purple-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  const getBadgeVariant = (priority: ContextualTip['priority']) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {displayTips.map((tip) => (
        <Card 
          key={tip.id} 
          className={cn(
            'border transition-all duration-300 hover:shadow-md',
            getTypeClasses(tip.type)
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Icon and emoji */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-lg">{tip.icon}</span>
                <div className={cn(
                  'p-1 rounded-full',
                  tip.type === 'info' ? 'text-blue-600' :
                  tip.type === 'success' ? 'text-green-600' :
                  tip.type === 'warning' ? 'text-yellow-600' :
                  tip.type === 'celebration' ? 'text-purple-600' :
                  'text-gray-600'
                )}>
                  {getTypeIcon(tip.type)}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{tip.title}</h4>
                  <Badge variant={getBadgeVariant(tip.priority)} className="text-xs">
                    {tip.priority}
                  </Badge>
                </div>
                <p className="text-sm opacity-90 mb-3">{tip.content}</p>
                
                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {tip.actionText && tip.actionUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => {
                        if (onAction) {
                          onAction(tip);
                        } else {
                          window.location.href = tip.actionUrl!;
                        }
                      }}
                    >
                      {tip.actionText}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Dismiss button */}
              {tip.dismissible && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 opacity-60 hover:opacity-100"
                  onClick={() => onDismiss(tip.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Floating contextual help for specific areas
interface FloatingContextualHelpProps {
  tips: ContextualTip[];
  onDismiss: (tipId: string) => void;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  maxTips?: number;
}

export function FloatingContextualHelp({ 
  tips, 
  onDismiss, 
  position = 'bottom-right', 
  maxTips = 1 
}: FloatingContextualHelpProps) {
  if (tips.length === 0) return null;

  const highPriorityTips = tips
    .filter(tip => tip.priority === 'high')
    .slice(0, maxTips);

  if (highPriorityTips.length === 0) return null;

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div className={cn(
      'fixed z-50 w-80 max-w-sm',
      positionClasses[position]
    )}>
      <ContextualHelp
        tips={highPriorityTips}
        onDismiss={onDismiss}
        maxTips={maxTips}
        className="animate-in slide-in-from-bottom-2 duration-300"
      />
    </div>
  );
}

// Inline contextual help for embedding in components
interface InlineContextualHelpProps {
  tips: ContextualTip[];
  onDismiss: (tipId: string) => void;
  filterTypes?: ContextualTip['type'][];
  showTitle?: boolean;
}

export function InlineContextualHelp({ 
  tips, 
  onDismiss, 
  filterTypes,
  showTitle = true
}: InlineContextualHelpProps) {
  const filteredTips = filterTypes 
    ? tips.filter(tip => filterTypes.includes(tip.type))
    : tips;

  if (filteredTips.length === 0) return null;

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-lg">Helpful Tips</h3>
        </div>
      )}
      <ContextualHelp
        tips={filteredTips}
        onDismiss={onDismiss}
        maxTips={3}
      />
    </div>
  );
}