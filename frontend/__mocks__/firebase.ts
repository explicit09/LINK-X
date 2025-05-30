// Firebase mocks for testing
export const auth = {
  currentUser: null,
  signInWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  onAuthStateChanged: jest.fn(),
};

export const GoogleAuthProvider = jest.fn(() => ({
  setCustomParameters: jest.fn(),
}));

export const getAuth = jest.fn(() => auth);

export const initializeApp = jest.fn();

export const getFirestore = jest.fn();

export const connectFirestoreEmulator = jest.fn();

// Mock Firebase config
export const firebaseConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test-auth-domain',
  projectId: 'test-project-id',
  storageBucket: 'test-storage-bucket',
  messagingSenderId: 'test-sender-id',
  appId: 'test-app-id',
};