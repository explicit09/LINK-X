'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCircle, Bell, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface SettingsTabsProps {
  accountContent: ReactNode;
  notificationsContent: ReactNode;
  privacyContent: ReactNode;
  defaultTab?: string;
}

export const SettingsTabs = ({
  accountContent,
  notificationsContent,
  privacyContent,
  defaultTab = 'account',
}: SettingsTabsProps) => {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList
        className={cn(
          'grid grid-cols-3 mb-8 bg-white rounded-xl border border-gray-200',
          'canvas-card shadow-sm',
        )}
      >
        <TabsTrigger
          value="account"
          className={cn(
            'flex items-center justify-center gap-2 canvas-small font-medium',
            'data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700',
            'data-[state=active]:border-blue-200 transition-all duration-200',
          )}
        >
          <UserCircle size={18} />
          Account
        </TabsTrigger>

        <TabsTrigger
          value="notifications"
          className={cn(
            'flex items-center justify-center gap-2 canvas-small font-medium',
            'data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700',
            'data-[state=active]:border-blue-200 transition-all duration-200',
          )}
        >
          <Bell size={18} />
          Notifications
        </TabsTrigger>

        <TabsTrigger
          value="privacy"
          className={cn(
            'flex items-center justify-center gap-2 canvas-small font-medium',
            'data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700',
            'data-[state=active]:border-blue-200 transition-all duration-200',
          )}
        >
          <Shield size={18} />
          Privacy
        </TabsTrigger>
      </TabsList>

      <TabsContent value="account">{accountContent}</TabsContent>

      <TabsContent value="notifications">{notificationsContent}</TabsContent>

      <TabsContent value="privacy">{privacyContent}</TabsContent>
    </Tabs>
  );
};
