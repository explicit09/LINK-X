"use client";

import React from "react";
import { Bell, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface PersonalizedHeaderProps {
  currentUser?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
}

export function PersonalizedHeader({ currentUser }: PersonalizedHeaderProps) {
  const firstName = currentUser?.name?.split(" ")[0] || "Student";
  const currentHour = new Date().getHours();
  
  const getGreeting = () => {
    if (currentHour < 12) return "Good morning";
    if (currentHour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getFocusTimeRemaining = () => {
    // Mock focus time calculation - could be based on real data
    return 45;
  };

  return (
    <div className="flex items-center justify-between bg-white px-6 py-4 border-b border-gray-200">
      <div className="flex items-center space-x-4">
        <div className="text-gray-500 text-sm">🌟</div>
        <div>
          <h1 className="text-xl font-medium text-gray-900">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm text-gray-500">
            Your focus peaks in {getFocusTimeRemaining()} mins
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="sm" className="text-gray-500">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="text-gray-500">
          <Settings className="h-4 w-4" />
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarImage src={currentUser?.avatar} />
          <AvatarFallback className="bg-blue-600 text-white text-xs">
            {firstName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}