'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { SimpleAuthProvider } from '@/contexts/SimpleAuth';
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
      <SimpleAuthProvider>
        <GamificationProvider>
          {children}
          <Toaster />
        </GamificationProvider>
      </SimpleAuthProvider>
    </ThemeProvider>
  );
}