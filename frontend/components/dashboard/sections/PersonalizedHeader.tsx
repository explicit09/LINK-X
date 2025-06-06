'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Search, User } from 'lucide-react';

interface PersonalizedHeaderProps {
  userName?: string;
  greeting?: string;
  motivationalMessage?: string;
}

export function PersonalizedHeader({ 
  userName = 'Student',
  greeting = 'Welcome back',
  motivationalMessage = 'Ready to continue your learning journey?'
}: PersonalizedHeaderProps) {
  const currentHour = new Date().getHours();
  const timeBasedGreeting = currentHour < 12 ? 'Good morning' : 
                           currentHour < 18 ? 'Good afternoon' : 
                           'Good evening';

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Greeting Section */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {timeBasedGreeting}, {userName}!
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {motivationalMessage}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}