'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { SupabaseProvider } from '@/contexts/SupabaseContext';
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
      <SupabaseProvider>
        {children}
        <Toaster />
      </SupabaseProvider>
    </ThemeProvider>
  );
}