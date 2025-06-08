'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { NoAuthProvider } from '@/contexts/NoAuthContext';
import { GamificationProvider } from '@/contexts/GamificationContext';
import { Toaster } from '@/components/ui/toaster';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <NoAuthProvider>
        <GamificationProvider>
          {children}
          <Toaster />
        </GamificationProvider>
      </NoAuthProvider>
    </ThemeProvider>
  );
}