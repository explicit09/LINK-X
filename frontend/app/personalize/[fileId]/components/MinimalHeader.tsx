import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MinimalHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function MinimalHeader({ 
  title, 
  subtitle, 
  onBack, 
  actions,
  className 
}: MinimalHeaderProps) {
  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}>
      <div className="flex h-14 items-center px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Back</span>
            </Button>
          )}
          
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 ml-4 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}