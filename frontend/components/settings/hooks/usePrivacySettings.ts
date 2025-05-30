import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface PrivacySettings {
  profileVisible: boolean;
  activityTracking: boolean;
  analyticsSharing: boolean;
  improvementSharing: boolean;
}

export function usePrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings>({
    profileVisible: true,
    activityTracking: true,
    analyticsSharing: false,
    improvementSharing: false,
  });
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const updateSetting = (key: keyof PrivacySettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const loadSettings = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/user/privacy-settings', {
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
      console.error('Error loading privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (): Promise<boolean> => {
    try {
      setSaving(true);

      const response = await fetch('/api/user/privacy-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save privacy settings');
      }

      toast.success('Privacy settings saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast.error('Failed to save privacy settings');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const downloadData = async () => {
    try {
      setDownloading(true);

      const response = await fetch('/api/user/download-data', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to initiate data download');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'my_data.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Data download started');
    } catch (error) {
      console.error('Error downloading data:', error);
      toast.error('Failed to download data');
    } finally {
      setDownloading(false);
    }
  };

  const deleteAccount = async (): Promise<boolean> => {
    try {
      setDeleting(true);

      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      toast.success('Account deletion initiated. You will receive a confirmation email.');
      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
      return false;
    } finally {
      setDeleting(false);
    }
  };

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    saving,
    loading,
    downloading,
    deleting,
    updateSetting,
    saveSettings,
    downloadData,
    deleteAccount,
    loadSettings
  };
}