"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Settings, Bell, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Hooks
import { useUserRole } from './hooks/useUserRole';

// Components
import { AccountSettings } from './sections/AccountSettings';
import { LearningPreferences } from './sections/LearningPreferences';
import { NotificationSettings } from './sections/NotificationSettings';
import { PrivacySettings } from './sections/PrivacySettings';

export default function StudentSettings() {
  const { role, loading: roleLoading, isStudent } = useUserRole();

  // Loading state
  if (roleLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-12 w-full" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="account" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            
            {isStudent && (
              <TabsTrigger value="learning" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Learning</span>
              </TabsTrigger>
            )}
            
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            
            <TabsTrigger value="privacy" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
          </TabsList>

          {/* Account Settings */}
          <TabsContent value="account">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">Account Settings</h2>
                <p className="text-muted-foreground">
                  Manage your account information and security settings
                </p>
              </div>
              <AccountSettings />
            </div>
          </TabsContent>

          {/* Learning Preferences (Student Only) */}
          {isStudent && (
            <TabsContent value="learning">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight">Learning Preferences</h2>
                  <p className="text-muted-foreground">
                    Customize your learning experience and AI interactions
                  </p>
                </div>
                <LearningPreferences />
              </div>
            </TabsContent>
          )}

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">Notification Settings</h2>
                <p className="text-muted-foreground">
                  Control when and how you receive notifications
                </p>
              </div>
              <NotificationSettings />
            </div>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">Privacy Settings</h2>
                <p className="text-muted-foreground">
                  Manage your privacy preferences and data usage
                </p>
              </div>
              <PrivacySettings />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}