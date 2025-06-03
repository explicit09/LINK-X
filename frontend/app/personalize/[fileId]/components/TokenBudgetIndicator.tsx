import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Zap, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TokenBudgetIndicatorProps {
  usage: number;
  limit: number;
  estimatedCost: number;
  percentageUsed: number;
  isApproachingLimit: boolean;
}

export function TokenBudgetIndicator({
  usage,
  limit,
  estimatedCost,
  percentageUsed,
  isApproachingLimit
}: TokenBudgetIndicatorProps) {
  const getProgressColor = () => {
    if (percentageUsed >= 90) return 'bg-red-500';
    if (percentageUsed >= 80) return 'bg-orange-500';
    if (percentageUsed >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusIcon = () => {
    if (percentageUsed >= 90) return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (percentageUsed >= 80) return <TrendingUp className="w-4 h-4 text-orange-500" />;
    return <Zap className="w-4 h-4 text-green-500" />;
  };

  const getStatusMessage = () => {
    if (percentageUsed >= 90) return 'Critical - Almost at limit';
    if (percentageUsed >= 80) return 'Warning - Approaching limit';
    if (percentageUsed >= 60) return 'Normal - Good pace';
    return 'Excellent - Plenty of tokens';
  };

  return (
    <Card className={cn(
      "p-4 transition-all duration-300",
      isApproachingLimit && "border-orange-500 shadow-orange-500/20 shadow-lg"
    )}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Token Budget</h3>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">{getStatusMessage()}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Usage</span>
            <span className="font-medium">
              {usage.toLocaleString()} / {limit.toLocaleString()} tokens
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={percentageUsed} 
              className="h-3 bg-secondary"
            />
            <div 
              className={cn(
                "absolute inset-0 h-3 rounded-full transition-all duration-500",
                getProgressColor()
              )}
              style={{ width: `${percentageUsed}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{Math.round(percentageUsed)}% used</span>
            <span>{(limit - usage).toLocaleString()} tokens remaining</span>
          </div>
        </div>

        {/* Cost estimation */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Estimated cost</span>
          </div>
          <span className="font-mono font-medium">
            ${estimatedCost.toFixed(4)}
          </span>
        </div>

        {/* Warning message */}
        {isApproachingLimit && (
          <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  Approaching token limit
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  Content generation will pause at {limit} tokens. You can resume in your next session.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 Tip: Tokens are preserved between sessions</p>
          <p>📊 Average session uses ~600-800 tokens</p>
        </div>
      </div>
    </Card>
  );
}