'use client';

import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "./(auth)/AuthContext";
import { useEffect } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-inter',
});

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

  // Add a useEffect to dynamically load the Firebase auth helper script after hydration
  useEffect(() => {
    // Only run on client side after hydration
    if (typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = '/firebase-auth-helper.js';
      script.async = true;
      document.head.appendChild(script);

      return () => {
        // Cleanup function
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* Firebase Auth Helper Script is now loaded via useEffect */}
      </head>
      <body className={`${inter.className} antialiased`}>
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
