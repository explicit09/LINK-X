'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AccountPanelProps } from '../types/settings.types';
import { validateEmail, validatePassword } from '../utils/validation';

export const AccountPanel = ({
  accountData,
  onAccountUpdate,
  className,
}: AccountPanelProps) => {
  const [formData, setFormData] = useState(accountData);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailChange = (email: string) => {
    setFormData((prev) => ({ ...prev, email }));
    setEmailError(
      !validateEmail(email) && email
        ? 'Please enter a valid email address'
        : '',
    );
  };

  const handlePasswordChange = (password: string) => {
    setFormData((prev) => ({ ...prev, password }));
    const error = validatePassword(password);
    setPasswordError(error || '');
  };

  const handleSubmit = async () => {
    // Validate before submission
    if (!validateEmail(formData.email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    const passwordValidation = validatePassword(formData.password);
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      return;
    }

    setIsSubmitting(true);
    try {
      await onAccountUpdate(formData);
    } catch (error) {
      console.error('Failed to update account:', error);
      // Handle error - could show toast notification
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={cn('canvas-card modern-hover', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <UserCircle className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="canvas-heading-3">
              Account Information
            </CardTitle>
            <CardDescription className="canvas-small">
              Update your email and password
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="canvas-body font-medium flex items-center gap-2"
          >
            <Mail className="h-4 w-4 text-gray-500" />
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e) => handleEmailChange(e.target.value)}
            className={cn(
              'canvas-card border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
              'text-gray-900 placeholder:text-gray-400 transition-all duration-200',
              emailError &&
                'border-red-500 focus:border-red-500 focus:ring-red-100',
            )}
          />
          {emailError && (
            <p className="text-red-500 canvas-small">{emailError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="canvas-body font-medium flex items-center gap-2"
          >
            <Lock className="h-4 w-4 text-gray-500" />
            New Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter new password (leave blank to keep current)"
              value={formData.password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              className={cn(
                'canvas-card border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
                'text-gray-900 placeholder:text-gray-400 transition-all duration-200 pr-10',
                passwordError &&
                  'border-red-500 focus:border-red-500 focus:ring-red-100',
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {passwordError && (
            <p className="text-red-500 canvas-small">{passwordError}</p>
          )}
        </div>
      </CardContent>

      <CardFooter className="border-t border-gray-100 pt-6">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !!emailError || !!passwordError}
          className={cn(
            'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600',
            'text-white shadow-sm hover:shadow-md transition-all duration-200 modern-hover button-pulse',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardFooter>
    </Card>
  );
};
