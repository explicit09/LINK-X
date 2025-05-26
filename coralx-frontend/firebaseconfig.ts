import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Use hardcoded values as fallback to ensure the app doesn't crash during development
// These should match the values in .env.local
const fallbackConfig = {
  apiKey: "AIzaSyAUdAeiRMkn7EbCf77J67Wx6w9zzHnX4i4",
  authDomain: "learn-x-757f8.firebaseapp.com",
  projectId: "learn-x-757f8",
  storageBucket: "learn-x-757f8.firebasestorage.app",
  messagingSenderId: "488449154963",
  appId: "1:488449154963:web:494a2ac9c7f841c5b31266",
  measurementId: "G-9PJW8GGBXK"
};

// Firebase configuration from environment variables with fallbacks
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || fallbackConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || fallbackConfig.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || fallbackConfig.measurementId,
};

// Check if any required values are still missing
const requiredConfigKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'appId'
];

const missingConfigKeys = requiredConfigKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingConfigKeys.length > 0) {
  console.warn('Some Firebase configuration values are still missing:', missingConfigKeys);
  console.warn('Using fallback values where available.');
}

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize auth
const auth = getAuth(app);

// Initialize analytics (only in browser environment)
let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// Configure Google provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { auth, googleProvider, analytics, app as default };