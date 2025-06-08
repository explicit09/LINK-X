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

      // TODO: Email update endpoint not implemented in backend
      // For now, just simulate the update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.info('Email update feature coming soon!');
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

      // TODO: Password update endpoint not implemented in backend
      // For now, just simulate the update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Clear password fields after successful update
      setAccountData((prev) => ({
        ...prev,
        password: '',
        confirmPassword: '',
      }));

      toast.info('Password update feature coming soon!');
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

      // Mock: Skip API call in no-auth mode
      const response = { 
        data: { 
          email: 'user@example.com',
          name: 'Default User',
          id: 'default-user'
        } 
      };
      // The backend returns { success: true, data: {...}, message: "Success", timestamp: "..." }
      const userData = response.data;
      
      setAccountData((prev) => ({
        ...prev,
        email: userData?.email || '',
      }));
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
