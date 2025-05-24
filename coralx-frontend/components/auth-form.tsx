import React from 'react';

import { Input } from './ui/input';
import { Label } from './ui/label';

export function AuthForm({
  action: passedInAction,
  children,
  defaultEmail = '',
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  defaultEmail?: string;
}) {
  // Wrap the passed-in action in an onSubmit handler so we can keep the API
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await passedInAction(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label
          htmlFor="email"
          className="text-sm font-medium text-gray-900"
        >
          Email Address
        </Label>

        <Input
          id="email"
          name="email"
          className="h-12 px-3 text-base border-gray-300 rounded-lg bg-white placeholder-gray-400 transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo focus:ring-opacity-20 focus:outline-none"
          type="email"
          placeholder="Enter your email"
          autoComplete="email"
          required
          autoFocus
          defaultValue={defaultEmail}
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="password"
          className="text-sm font-medium text-gray-900"
        >
          Password
        </Label>

        <Input
          id="password"
          name="password"
          className="h-12 px-3 text-base border-gray-300 rounded-lg bg-white placeholder-gray-400 transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo focus:ring-opacity-20 focus:outline-none"
          type="password"
          placeholder="Enter your password"
          required
        />
        
        {/* Inline Security Note */}
        <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span>Encrypted</span>
        </div>
      </div>

      <div className="pt-2">
        {children}
      </div>
    </form>
  );
}
