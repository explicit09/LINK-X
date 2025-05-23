"use client";

import { ReactNode, useEffect, useState } from "react";
import { auth } from "@/firebaseconfig";
import { onAuthStateChanged } from "firebase/auth";
import { sessionLogin } from "@/lib/api";
import { toast } from "sonner";

interface FirebaseAuthProviderProps {
  children: ReactNode;
}

export function FirebaseAuthProvider({ children }: FirebaseAuthProviderProps) {
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, establish session with backend
        try {
          const success = await sessionLogin();
          if (!success) {
            console.warn("Failed to establish backend session");
            // Don't show toast here to avoid spamming users
          }
        } catch (error) {
          console.error("Error establishing session:", error);
        }
      }
      
      setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  // Add CORS fix for Firebase auth
  useEffect(() => {
    // This helps with Firebase auth in iframe environments
    if (typeof window !== 'undefined') {
      // Set auth persistence to local
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = 'https://link-x-7826d.firebaseapp.com/__/auth/iframe';
      document.body.appendChild(iframe);

      return () => {
        document.body.removeChild(iframe);
      };
    }
  }, []);

  if (!authInitialized) {
    // You could show a loading spinner here
    return <div className="flex h-screen w-screen items-center justify-center">Initializing authentication...</div>;
  }

  return <>{children}</>;
}
