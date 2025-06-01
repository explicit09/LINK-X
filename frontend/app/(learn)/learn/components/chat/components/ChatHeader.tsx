'use client';

import { Brain, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatHeaderProps } from '../types';
import { cn } from '@/lib/utils';

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  isMinimized,
  onToggleMinimize,
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
          <Brain className="h-5 w-5 text-white" />
        </div>
        {!isMinimized && (
          <div>
            <h3 className="canvas-heading-3">AI Tutor</h3>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="canvas-small text-green-600 font-medium">
                Online & Ready
              </span>
            </div>
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleMinimize}
        className="sidebar-text-muted hover:sidebar-text modern-hover"
      >
        {isMinimized ? (
          <Maximize2 className="h-4 w-4" />
        ) : (
          <Minimize2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};
