"use client";

import React from "react";
import Image from "next/image";

interface MiniFooterProps {
  sidebarCollapsed?: boolean;
}

export function MiniFooter({ sidebarCollapsed = false }: MiniFooterProps) {
  return (
    <footer className={`fixed bottom-0 right-0 h-8 md:h-10 border-t border-slate-800 bg-slate-900 text-[12px] text-slate-400 dark:text-slate-300 z-40 transition-all duration-300 ${
      sidebarCollapsed ? 'left-16' : 'left-64'
    }`}>
      <div className="flex h-full items-center justify-between px-4 md:px-5">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Image
            src="/images/learn-x-logo.svg"
            alt="Learn-X"
            width={12}
            height={12}
            className="h-3 w-3 opacity-75"
          />
          <span>© {new Date().getFullYear()} Learn-X</span>
        </div>

        {/* Essential links */}
        <nav className="flex items-center gap-6">
          <a className="hover:text-white hover:underline transition-colors" href="/privacy">
            Privacy
          </a>
          <a className="hover:text-white hover:underline transition-colors" href="/terms">
            Terms
          </a>
          <a className="hover:text-white hover:underline transition-colors" href="/help">
            Help
          </a>
        </nav>
      </div>
    </footer>
  );
}