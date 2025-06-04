import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Save } from 'lucide-react';
import { SettingCard } from '../ui/SettingCard';
import { useAccountSettings } from '../hooks/useAccountSettings';

export function AccountSettings() {
  const {
    accountData,
    saving,
    loadingAccount,
    updateAccountField,
    updateEmail,
    updatePassword,
    loadCurrentEmail,
    validatePassword,
    validateEmail,
  } = useAccountSettings();

  // Load current email on mount
  useEffect(() => {
    loadCurrentEmail();
  }, []);

  const handleEmailUpdate = async () => {
    await updateEmail();
  };

  const handlePasswordUpdate = async () => {
    await updatePassword();
  };

  return (
    <div className="space-y-6">
      {/* Email Settings */}
      <SettingCard
        title="Email Address"
        description="Update your email address for account access and notifications"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Email Address</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={accountData.email}
              onChange={(e) => updateAccountField('email', e.target.value)}
              placeholder="your.email@example.com"
              disabled={loadingAccount}
            />
          </div>
          <Button
            onClick={handleEmailUpdate}
            disabled={saving || !accountData.email || !validateEmail()}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Save className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Email
              </>
            )}
          </Button>
        </div>
      </SettingCard>

      {/* Password Settings */}
      <SettingCard
        title="Password"
        description="Change your account password for better security"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span>New Password</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={accountData.password}
              onChange={(e) => updateAccountField('password', e.target.value)}
              placeholder="Enter new password"
            />
            <p className="text-xs text-muted-foreground">
              Password must be at least 6 characters long
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="flex items-center space-x-2"
            >
              <Lock className="h-4 w-4" />
              <span>Confirm Password</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={accountData.confirmPassword}
              onChange={(e) =>
                updateAccountField('confirmPassword', e.target.value)
              }
              placeholder="Confirm new password"
            />
          </div>

          <Button
            onClick={handlePasswordUpdate}
            disabled={
              saving ||
              !accountData.password ||
              !accountData.confirmPassword ||
              !validatePassword()
            }
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Save className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Password
              </>
            )}
          </Button>
        </div>
      </SettingCard>
    </div>
  );
}
