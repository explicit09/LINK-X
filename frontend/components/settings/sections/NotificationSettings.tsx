import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Bell,
  Shield,
  Megaphone,
  Save,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { SettingCard } from '../ui/SettingCard';
import { SettingToggle } from '../ui/SettingToggle';
import { useNotificationSettings } from '../hooks/useNotificationSettings';

export function NotificationSettings() {
  const {
    settings,
    saving,
    loading,
    updateSetting,
    saveSettings,
    enableAll,
    disableAll,
  } = useNotificationSettings();

  const handleSave = async () => {
    await saveSettings();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <SettingCard key={i} title="Loading..." description="Please wait...">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </SettingCard>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Learning Notifications */}
      <SettingCard
        title="Learning Notifications"
        description="Notifications related to your courses and learning progress"
      >
        <div className="space-y-4">
          <SettingToggle
            id="learningReminders"
            label="Learning Reminders"
            description="Get reminded to continue your learning journey"
            checked={settings.learningReminders}
            onCheckedChange={(checked) =>
              updateSetting('learningReminders', checked)
            }
            icon={<Bell className="h-4 w-4 text-blue-500" />}
          />

          <SettingToggle
            id="courseUpdates"
            label="Course Updates"
            description="Notifications when your courses are updated with new content"
            checked={settings.courseUpdates}
            onCheckedChange={(checked) =>
              updateSetting('courseUpdates', checked)
            }
            icon={<Bell className="h-4 w-4 text-green-500" />}
          />

          <SettingToggle
            id="quizResults"
            label="Quiz Results"
            description="Get notified when quiz results and feedback are available"
            checked={settings.quizResults}
            onCheckedChange={(checked) => updateSetting('quizResults', checked)}
            icon={<Bell className="h-4 w-4 text-purple-500" />}
          />

          <SettingToggle
            id="weeklyProgress"
            label="Weekly Progress Reports"
            description="Receive weekly summaries of your learning progress"
            checked={settings.weeklyProgress}
            onCheckedChange={(checked) =>
              updateSetting('weeklyProgress', checked)
            }
            icon={<Bell className="h-4 w-4 text-orange-500" />}
          />

          <SettingToggle
            id="achievements"
            label="Achievements"
            description="Celebrate your learning milestones and achievements"
            checked={settings.achievements}
            onCheckedChange={(checked) =>
              updateSetting('achievements', checked)
            }
            icon={<Bell className="h-4 w-4 text-yellow-500" />}
          />
        </div>
      </SettingCard>

      {/* System Notifications */}
      <SettingCard
        title="System Notifications"
        description="Important notifications about your account and platform updates"
      >
        <div className="space-y-4">
          <SettingToggle
            id="securityAlerts"
            label="Security Alerts"
            description="Important security notifications about your account"
            checked={settings.securityAlerts}
            onCheckedChange={(checked) =>
              updateSetting('securityAlerts', checked)
            }
            icon={<Shield className="h-4 w-4 text-red-500" />}
          />

          <SettingToggle
            id="productUpdates"
            label="Product Updates"
            description="Notifications about new features and platform improvements"
            checked={settings.productUpdates}
            onCheckedChange={(checked) =>
              updateSetting('productUpdates', checked)
            }
            icon={<Megaphone className="h-4 w-4 text-blue-500" />}
          />

          <SettingToggle
            id="marketing"
            label="Marketing Communications"
            description="Tips, best practices, and educational content via email"
            checked={settings.marketing}
            onCheckedChange={(checked) => updateSetting('marketing', checked)}
            icon={<Megaphone className="h-4 w-4 text-green-500" />}
          />
        </div>
      </SettingCard>

      {/* Quick Actions */}
      <SettingCard
        title="Quick Actions"
        description="Bulk actions for notification preferences"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={enableAll}
            disabled={saving}
            className="flex items-center justify-center"
          >
            <ToggleRight className="h-4 w-4 mr-2" />
            Enable All
          </Button>
          <Button
            variant="outline"
            onClick={disableAll}
            disabled={saving}
            className="flex items-center justify-center"
          >
            <ToggleLeft className="h-4 w-4 mr-2" />
            Disable All (Keep Security)
          </Button>
        </div>
      </SettingCard>

      {/* Save Actions */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Save className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Notification Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
