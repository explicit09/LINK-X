'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PrivacyPanelProps } from '../types/settings.types';

export const PrivacyPanel = ({
  settings,
  onSettingsUpdate,
  className,
}: PrivacyPanelProps) => {
  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    onSettingsUpdate({
      ...settings,
      [key]: value,
    });
  };

  return (
    <Card className={cn('canvas-card modern-hover', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <Shield className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <CardTitle className="canvas-heading-3">
              Privacy & Security
            </CardTitle>
            <CardDescription className="canvas-small">
              Manage your data and privacy settings
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div className="space-y-1">
            <p className="canvas-body font-medium">Profile Visibility</p>
            <p className="canvas-small text-gray-600">
              Control who can see your profile information
            </p>
          </div>
          <Switch
            checked={settings.profileVisibility}
            onCheckedChange={(checked) =>
              handleToggle('profileVisibility', checked)
            }
            className="data-[state=checked]:bg-blue-600"
          />
        </div>

        <div className="space-y-3 py-3">
          <div>
            <p className="canvas-body font-medium">Data Usage</p>
            <p className="canvas-small text-gray-600 mb-3">
              We collect anonymized data to improve your learning experience and
              platform performance.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300',
              'transition-all duration-200',
            )}
          >
            View Data Policy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
