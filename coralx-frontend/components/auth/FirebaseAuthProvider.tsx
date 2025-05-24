"use client";

import { ReactNode, useEffect, useState, useCallback } from "react";
import { auth } from "@/firebaseconfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { sessionLogin } from "@/lib/api";
import { toast } from "sonner";

interface FirebaseAuthProviderProps {
  children: ReactNode;
}

export function FirebaseAuthProvider({ children }: FirebaseAuthProviderProps) {
  const [authInitialized, setAuthInitialized] = useState(false);
  const [loading, setLoading] = useState(false);

  // Establish session with backend when user is authenticated
  const establishSession = useCallback(async (user: User | null) => {
    if (user) {
      setLoading(true);
      try {
        // Get a fresh token before trying to establish session
        const freshToken = await user.getIdToken(true);
        console.log('Got fresh token for session establishment');
        
        // Try to establish session with backend
        const success = await sessionLogin();
        if (!success) {
          console.warn('Failed to establish backend session');
          
          // Check if we're using 127.0.0.1 which might not be authorized
          if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
            console.warn('Using 127.0.0.1 which may not be authorized in Firebase. Try using localhost instead.');
            // Redirect to localhost equivalent if on 127.0.0.1
            const currentPort = window.location.port;
            const localhostUrl = `http://localhost:${currentPort}${window.location.pathname}${window.location.search}`;
            window.location.href = localhostUrl;
            return;
          }
          
          // Try one more time after a short delay
          setTimeout(async () => {
            const retrySuccess = await sessionLogin();
            if (!retrySuccess) {
              console.error('Failed to establish session after retry');
              toast.error("Authentication error: Unable to establish a session with the backend");
            } else {
              console.log('Backend session established successfully on retry');
            }
          }, 2000);
        } else {
          console.log('Backend session established successfully');
        }
      } catch (error) {
        console.error('Error establishing session:', error);
        toast.error("Authentication error: Please try again");
      } finally {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('User authenticated with Firebase, establishing backend session...');
        await establishSession(user);
      } else {
        console.log('No user authenticated with Firebase');
      }
      
      setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, [establishSession]);

  // Configure Firebase auth persistence and domain authorization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Set Firebase auth persistence to local for better user experience
      import('firebase/auth').then(({ browserLocalPersistence, setPersistence }) => {
        setPersistence(auth, browserLocalPersistence)
          .then(() => {
            console.log('Firebase persistence set to local');
          })
          .catch((error) => {
            console.error('Error setting persistence:', error);
          });
      });
      
      // Create a hidden iframe to help with Firebase auth in development
      try {
        // First, check if we're using localhost (required for Firebase auth)
        if (window.location.hostname === '127.0.0.1') {
          console.warn('Using 127.0.0.1 which is not authorized for Firebase auth. Redirecting to localhost...');
          const port = window.location.port;
          const path = window.location.pathname;
          const search = window.location.search;
          window.location.href = `http://localhost:${port}${path}${search}`;
          return;
        }
        
        // Add auth domain iframe for development environments
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = 'https://learn-x-757f8.firebaseapp.com/__/auth/iframe';
        document.body.appendChild(iframe);

        // Also add localhost to authorized domains via iframe
        const localhostIframe = document.createElement('iframe');
        localhostIframe.style.display = 'none';
        localhostIframe.src = `${window.location.origin}/firebase-auth.html`;
        document.body.appendChild(localhostIframe);

        return () => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          if (document.body.contains(localhostIframe)) {
            document.body.removeChild(localhostIframe);
          }
        };
      } catch (error) {
        console.error('Error setting up Firebase auth iframes:', error);
      }
    }
  }, []);

  if (!authInitialized) {
    // You could show a loading spinner here
    return <div className="flex h-screen w-screen items-center justify-center">Initializing authentication...</div>;
  }

  return <>{children}</>;
}
