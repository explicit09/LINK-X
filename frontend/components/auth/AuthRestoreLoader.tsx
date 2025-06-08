'use client';

import { useEffect, useState } from 'react';

export function AuthRestoreLoader() {
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    // Only show loader after a short delay to prevent flash
    const timer = setTimeout(() => {
      setShowLoader(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (!showLoader) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div className="text-center">
        <img
          src="/images/LearnXLogo.png"
          alt="LEARN-X"
          className="h-12 w-auto mx-auto mb-6 animate-pulse"
        />
        <div className="w-8 h-8 border-2 border-brand-indigo border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Restoring your session...</p>
      </div>
    </div>
  );
}