'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/app/(auth)/AuthContext';
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
      <AuthProvider>
        <GamificationProvider>
          {children}
          <Toaster />
        </GamificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}