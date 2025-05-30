import React from 'react';
import { Brain, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarHeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ collapsed, onToggle }) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-black/20">
      {!collapsed && (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">LEARN-X Learn</h1>
            <p className="text-xs text-blue-200">AI-Powered Learning</p>
          </div>
        </div>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="text-gray-300 hover:text-white hover:bg-white/10"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>
    </div>
  );
};