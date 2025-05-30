import React from 'react';
import { Settings, Bell, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar } from './Avatar';

interface SidebarFooterProps {
  collapsed: boolean;
  onSignOut: () => void;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({ collapsed, onSignOut }) => {
  return (
    <div className="border-t border-gray-700/50 p-4 bg-black/20">
      {!collapsed ? (
        <div className="space-y-3">
          {/* User Profile */}
          <div className="flex items-center gap-3">
            <Avatar />
            <div className="flex-1">
              <p className="font-medium text-white text-sm">Learning Mode</p>
              <div className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-purple-400" />
                <span className="text-xs text-purple-300">AI Enhanced</span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-gray-300 hover:text-white hover:bg-white/10"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-gray-300 hover:text-white hover:bg-white/10"
                >
                  <Bell className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSignOut}
                  className="flex-1 text-gray-300 hover:text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sign Out</TooltipContent>
            </Tooltip>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-gray-300 hover:text-white hover:bg-white/10"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSignOut}
                className="w-full text-gray-300 hover:text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign Out</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
};