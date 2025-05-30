"use client";

import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SuggestionListProps } from "../types";

export const SuggestionList: React.FC<SuggestionListProps> = ({ suggestions, visible }) => {
  if (!visible) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-2">
        <Zap className="h-4 w-4 text-purple-600" />
        <span className="canvas-small font-semibold text-gray-700">Quick Actions</span>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {suggestions.map((suggestion) => {
          const IconComponent = suggestion.icon;
          return (
            <Button
              key={suggestion.id}
              variant="outline"
              size="sm"
              onClick={suggestion.action}
              className={cn(
                "justify-start h-auto py-3 text-left transition-all duration-200 modern-hover",
                suggestion.color
              )}
            >
              <IconComponent className="h-4 w-4 mr-3 flex-shrink-0" />
              <span className="canvas-small font-medium">{suggestion.text}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};