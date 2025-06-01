'use client';

import { ReactNode } from 'react';
import Header from '@/components/learn-x/Header';
import Footer from '@/components/landing/Footer';
import { SettingsHeader } from './SettingsHeader';

interface SettingsLayoutProps {
  children: ReactNode;
  isLoggedIn?: boolean;
}

export const SettingsLayout = ({
  children,
  isLoggedIn = true,
}: SettingsLayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header isLoggedIn={isLoggedIn} />

      <div className="pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SettingsHeader />
          {children}
        </div>
      </div>

      <Footer />
    </div>
  );
};
