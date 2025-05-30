import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  EyeOff, 
  BarChart3, 
  Share2, 
  Download, 
  Trash2, 
  Save,
  AlertTriangle,
  Info
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SettingCard } from '../ui/SettingCard';
import { SettingToggle } from '../ui/SettingToggle';
import { usePrivacySettings } from '../hooks/usePrivacySettings';

export function PrivacySettings() {
  const {
    settings,
    saving,
    loading,
    downloading,
    deleting,
    updateSetting,
    saveSettings,
    downloadData,
    deleteAccount
  } = usePrivacySettings();

  const handleSave = async () => {
    await saveSettings();
  };

  const handleDeleteAccount = async () => {
    await deleteAccount();
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
      {/* Profile Privacy */}
      <SettingCard
        title="Profile Privacy"
        description="Control who can see your profile and learning activity"
      >
        <div className="space-y-4">
          <SettingToggle
            id="profileVisible"
            label="Profile Visibility"
            description="Allow other students and instructors to see your basic profile information"
            checked={settings.profileVisible}
            onCheckedChange={(checked) => updateSetting('profileVisible', checked)}
            icon={settings.profileVisible ? 
              <Eye className="h-4 w-4 text-green-500" /> : 
              <EyeOff className="h-4 w-4 text-gray-500" />
            }
          />
        </div>
      </SettingCard>

      {/* Learning Analytics */}
      <SettingCard
        title="Learning Analytics"
        description="Control how your learning data is used to improve your experience"
      >
        <div className="space-y-4">
          <SettingToggle
            id="activityTracking"
            label="Activity Tracking"
            description="Allow us to track your learning activity to provide personalized recommendations"
            checked={settings.activityTracking}
            onCheckedChange={(checked) => updateSetting('activityTracking', checked)}
            icon={<BarChart3 className="h-4 w-4 text-blue-500" />}
          />

          <SettingToggle
            id="analyticsSharing"
            label="Anonymous Analytics Sharing"
            description="Share anonymized learning data to help improve the platform for everyone"
            checked={settings.analyticsSharing}
            onCheckedChange={(checked) => updateSetting('analyticsSharing', checked)}
            icon={<Share2 className="h-4 w-4 text-purple-500" />}
          />

          <SettingToggle
            id="improvementSharing"
            label="Platform Improvement"
            description="Use your data to improve AI models and platform features"
            checked={settings.improvementSharing}
            onCheckedChange={(checked) => updateSetting('improvementSharing', checked)}
            icon={<BarChart3 className="h-4 w-4 text-orange-500" />}
          />
        </div>
      </SettingCard>

      {/* Data Management */}
      <SettingCard
        title="Data Management"
        description="Download or delete your personal data"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Your Data Rights</p>
              <p>You have the right to download or delete your personal data at any time. Downloaded data will include your profile, learning progress, and course materials.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={downloadData}
              disabled={downloading}
              className="flex items-center justify-center"
            >
              {downloading ? (
                <>
                  <Download className="h-4 w-4 mr-2 animate-spin" />
                  Preparing Download...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download My Data
                </>
              )}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={deleting}
                  className="flex items-center justify-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span>Delete Account</span>
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>Are you sure you want to delete your account? This action cannot be undone.</p>
                    <div className="bg-red-50 p-3 rounded">
                      <p className="text-red-800 text-sm">
                        <strong>This will permanently delete:</strong>
                      </p>
                      <ul className="text-red-700 text-sm mt-1 list-disc list-inside">
                        <li>Your profile and account information</li>
                        <li>All learning progress and achievements</li>
                        <li>Course enrollments and materials</li>
                        <li>Chat history and personalized content</li>
                      </ul>
                    </div>
                    <p className="text-sm">You will receive a confirmation email before final deletion.</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Delete Account'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
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
              Save Privacy Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}