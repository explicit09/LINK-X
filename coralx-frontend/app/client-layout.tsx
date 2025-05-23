'use client';

import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "./(auth)/AuthContext";
import { useEffect } from "react";
import Script from 'next/script';
import "./globals.css";

const LIGHT_THEME_COLOR = "hsl(0 0% 100%)";
const DARK_THEME_COLOR = "hsl(240deg 10% 3.92%)";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // Redirect from 127.0.0.1 to localhost for Firebase auth compatibility
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
      const port = window.location.port;
      const path = window.location.pathname;
      const search = window.location.search;
      const localhostUrl = `http://localhost:${port}${path}${search}`;
      console.log('Redirecting from 127.0.0.1 to localhost for Firebase auth compatibility');
      window.location.href = localhostUrl;
    }
  }, []);

  useEffect(() => {
    const updateThemeColor = () => {
      const html = document.documentElement;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        const isDark = html.classList.contains('dark');
        meta.setAttribute('content', isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
      }
    };

    const observer = new MutationObserver(updateThemeColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    updateThemeColor();
    return () => observer.disconnect();
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Firebase Auth Helper Script */}
        <Script src="/firebase-auth-helper.js" strategy="beforeInteractive" />
      </head>
      <body>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </AuthProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
