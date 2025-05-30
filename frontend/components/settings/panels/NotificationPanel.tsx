"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationPanelProps } from "../types/settings.types";

export const NotificationPanel = ({ 
  settings, 
  onSettingsUpdate,
  className 
}: NotificationPanelProps) => {
  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    onSettingsUpdate({
      ...settings,
      [key]: value,
    });
  };

  return (
    <Card className={cn("canvas-card modern-hover", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
            <Bell className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <CardTitle className="canvas-heading-3">Notification Preferences</CardTitle>
            <CardDescription className="canvas-small">
              Control how and when you receive notifications
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div className="space-y-1">
            <p className="canvas-body font-medium">Push Notifications</p>
            <p className="canvas-small text-gray-600">
              Receive device alerts for important updates
            </p>
          </div>
          <Switch
            checked={settings.pushNotifications}
            onCheckedChange={(checked) => handleToggle('pushNotifications', checked)}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>
        
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div className="space-y-1">
            <p className="canvas-body font-medium">Email Notifications</p>
            <p className="canvas-small text-gray-600">
              Get email updates about courses and assignments
            </p>
          </div>
          <Switch 
            checked={settings.emailNotifications} 
            onCheckedChange={(checked) => handleToggle('emailNotifications', checked)}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>
        
        <div className="flex items-center justify-between py-3">
          <div className="space-y-1">
            <p className="canvas-body font-medium">Weekly Digest</p>
            <p className="canvas-small text-gray-600">
              Summary of weekly activity and upcoming deadlines
            </p>
          </div>
          <Switch 
            checked={settings.weeklyDigest} 
            onCheckedChange={(checked) => handleToggle('weeklyDigest', checked)}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>
      </CardContent>
    </Card>
  );
};