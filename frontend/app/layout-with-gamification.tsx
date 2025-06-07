import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toaster } from 'sonner';
import { GamificationProvider } from '@/contexts/GamificationContext';
import { XPAnimationOverlay } from '@/components/gamification/XPAnimationOverlay';
import './globals.css';

export const metadata: Metadata = {
  title: 'Learn-X',
  description: 'AI-powered personalized learning platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        <GamificationProvider>
          {children}
          <Toaster 
            position="top-right"
            richColors
            expand={true}
            closeButton
          />
          <XPAnimationOverlay />
        </GamificationProvider>
      </body>
    </html>
  );
}