'use client';

import { ReactNode, useEffect } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { AlertProvider } from '@/contexts/AlertContext';
import { setupGlobalErrorHandlers } from '@/lib/error-handlers';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  // Setup global error handlers for IndexedDB issues
  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AlertProvider>
        {children}
      </AlertProvider>
    </ThemeProvider>
  );
}