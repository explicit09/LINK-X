import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface NotificationSettings {
  learningReminders: boolean;
  courseUpdates: boolean;
  quizResults: boolean;
  weeklyProgress: boolean;
  achievements: boolean;
  securityAlerts: boolean;
  productUpdates: boolean;
  marketing: boolean;
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    learningReminders: true,
    courseUpdates: true,
    quizResults: true,
    weeklyProgress: true,
    achievements: true,
    securityAlerts: true,
    productUpdates: false,
    marketing: false,
  });
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const loadSettings = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/user/notification-settings', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({
          ...prev,
          ...data
        }));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (): Promise<boolean> => {
    try {
      setSaving(true);

      const response = await fetch('/api/user/notification-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save notification settings');
      }

      toast.success('Notification settings saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save notification settings');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const enableAll = () => {
    setSettings({
      learningReminders: true,
      courseUpdates: true,
      quizResults: true,
      weeklyProgress: true,
      achievements: true,
      securityAlerts: true,
      productUpdates: true,
      marketing: true,
    });
  };

  const disableAll = () => {
    setSettings({
      learningReminders: false,
      courseUpdates: false,
      quizResults: false,
      weeklyProgress: false,
      achievements: false,
      securityAlerts: true, // Keep security alerts enabled
      productUpdates: false,
      marketing: false,
    });
  };

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    saving,
    loading,
    updateSetting,
    saveSettings,
    enableAll,
    disableAll,
    loadSettings
  };
}