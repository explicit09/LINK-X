import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

// Only check in development and if running in Node.js context
const missingVars = typeof window === 'undefined' 
  ? requiredEnvVars.filter(envVar => !process.env[envVar])
  : [];

if (missingVars.length > 0 && process.env.NODE_ENV === 'development') {
  console.warn('⚠️ Missing Firebase environment variables:', missingVars);
  console.info('📝 Please ensure .env.local contains your Firebase configuration');
}

// Firebase configuration with error handling
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Safer initialization with proper error handling
let app: FirebaseApp;
let auth: Auth;
let analytics: Analytics | null = null;

try {
  // Check if Firebase is already initialized
  const existingApps = getApps();
  
  if (existingApps.length === 0) {
    // Only initialize if we have valid config
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
      app = initializeApp(firebaseConfig);
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Firebase initialized successfully');
      }
    } else {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Firebase configuration missing. Check your .env.local file.');
      }
      // Create a mock app to prevent errors
      app = {} as FirebaseApp;
    }
  } else {
    app = existingApps[0];
    console.log('🔄 Using existing Firebase app');
  }
  
  // Initialize auth with error handling
  if (app && typeof app === 'object' && 'options' in app) {
    auth = getAuth(app);
  } else {
    // Create mock auth to prevent crashes
    auth = {} as Auth;
    console.warn('⚠️ Firebase Auth not initialized: Invalid app');
  }
  
  // Initialize analytics only in browser and production
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    isSupported().then((supported) => {
      if (supported && app && 'options' in app) {
        analytics = getAnalytics(app);
        console.log('📊 Firebase Analytics initialized');
      }
    }).catch((error) => {
      console.warn('Analytics initialization failed:', error);
    });
  }
  
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  // Provide fallback objects to prevent crashes
  app = {} as FirebaseApp;
  auth = {} as Auth;
  analytics = null;
}

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

export { app, auth, analytics, googleProvider };