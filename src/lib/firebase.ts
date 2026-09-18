import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Pure environment variable loader (e.g., for Vercel or custom host environments)
const getClientFirebaseConfig = () => {
  // Method 1: Check for raw JSON string in VITE_FIREBASE_CONFIG
  const rawJsonConfig = import.meta.env.VITE_FIREBASE_CONFIG;
  if (rawJsonConfig) {
    try {
      return JSON.parse(rawJsonConfig);
    } catch {
      console.warn('Failed to parse VITE_FIREBASE_CONFIG JSON string');
    }
  }

  // Method 2: Check for individual VITE_FIREBASE_* environment variables
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || ''
  };
};

const firebaseConfig = getClientFirebaseConfig();

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Cloud Firestore using the configured database ID
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Connection test helper per Firebase integration guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline. Check Firebase VITE_FIREBASE_* environment variables.');
    }
    return false;
  }
}

// Test connection on module boot
if (firebaseConfig.apiKey) {
  testFirestoreConnection();
}

export default app;
