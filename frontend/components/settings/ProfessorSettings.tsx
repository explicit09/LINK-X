"use client";

import { 
  SettingsLayout,
  SettingsTabs,
  AccountPanel,
  NotificationPanel,
  PrivacyPanel,
  useSettings
} from './index';

/**
 * ProfessorSettings Component
 * 
 * This is a refactored version that maintains backward compatibility
 * while using a modular architecture with separated concerns.
 * 
 * The component has been broken down into:
 * - Individual setting panels (Account, Notifications, Privacy)
 * - Reusable form components and validation hooks
 * - Separated validation and submission logic
 * - Proper TypeScript types for settings data
 * - Custom hooks for form management
 */
const ProfessorSettings = () => {
  const {
    loading,
    account,
    notifications,
    privacy,
    updateAccount,
    updateNotifications,
    updatePrivacy,
  } = useSettings();

  if (loading) {
    return (
      <SettingsLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading settings...</div>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <SettingsTabs
        accountContent={
          <AccountPanel 
            accountData={account}
            onAccountUpdate={updateAccount}
          />
        }
        notificationsContent={
          <NotificationPanel
            settings={notifications}
            onSettingsUpdate={updateNotifications}
          />
        }
        privacyContent={
          <PrivacyPanel
            settings={privacy}
            onSettingsUpdate={updatePrivacy}
          />
        }
      />
    </SettingsLayout>
  );
};

export default ProfessorSettings;