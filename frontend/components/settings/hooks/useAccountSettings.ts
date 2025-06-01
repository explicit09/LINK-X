import { useState } from 'react';
import { toast } from 'sonner';

export interface AccountData {
  email: string;
  password: string;
  confirmPassword: string;
}

export function useAccountSettings() {
  const [accountData, setAccountData] = useState<AccountData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(false);

  const updateAccountField = (field: keyof AccountData, value: string) => {
    setAccountData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validatePassword = (): boolean => {
    if (accountData.password && accountData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return false;
    }

    if (
      accountData.password &&
      accountData.password !== accountData.confirmPassword
    ) {
      toast.error('Passwords do not match');
      return false;
    }

    return true;
  };

  const validateEmail = (): boolean => {
    if (accountData.email && !/\S+@\S+\.\S+/.test(accountData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const updateEmail = async (): Promise<boolean> => {
    if (!validateEmail()) return false;

    try {
      setSaving(true);

      const response = await fetch('/api/auth/update-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: accountData.email }),
      });

      if (!response.ok) {
        throw new Error('Failed to update email');
      }

      toast.success('Email updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating email:', error);
      toast.error('Failed to update email');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = async (): Promise<boolean> => {
    if (!validatePassword()) return false;

    try {
      setSaving(true);

      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ password: accountData.password }),
      });

      if (!response.ok) {
        throw new Error('Failed to update password');
      }

      // Clear password fields after successful update
      setAccountData((prev) => ({
        ...prev,
        password: '',
        confirmPassword: '',
      }));

      toast.success('Password updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const loadCurrentEmail = async () => {
    try {
      setLoadingAccount(true);

      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAccountData((prev) => ({
          ...prev,
          email: data.email || '',
        }));
      }
    } catch (error) {
      console.error('Error loading current email:', error);
    } finally {
      setLoadingAccount(false);
    }
  };

  return {
    accountData,
    saving,
    loadingAccount,
    updateAccountField,
    updateEmail,
    updatePassword,
    loadCurrentEmail,
    validatePassword,
    validateEmail,
  };
}
