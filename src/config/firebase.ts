/**
 * Firebase Configuration
 * 
 * This file provides optional Firebase integration.
 * The app works with localStorage by default.
 * 
 * To enable Firebase:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (or use existing)
 * 3. Enable Authentication > Email/Password
 * 4. Enable Firestore Database
 * 5. Copy your config from Project Settings > General
 * 6. Create .env file and add your credentials
 * 7. Restart the dev server
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { getMessaging, Messaging, getToken } from 'firebase/messaging';

// Check if all required Firebase environment variables are present
const isFirebaseConfigured = () => {
  return !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET &&
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID
  );
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;
let messaging: Messaging | null = null;

// Only initialize Firebase if properly configured
if (isFirebaseConfigured()) {
  try {
    // Use environment variables for Firebase configuration
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
    };

    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    analytics = getAnalytics(app);
    messaging = getMessaging(app);


  } catch (error) {
    console.error('❌ [FIREBASE] Initialization failed:', error);
    console.error('❗ [MODE] Firebase is required for this application');
  }
} else {
  console.error('❗ [FIREBASE] Firebase configuration is required');
  console.error('💡 [TIP] Please check your .env file and ensure all VITE_FIREBASE_* variables are set');
}

// Export Firebase services (will be null if not configured)
export { auth, db, app, analytics, messaging, getToken };

// Export helper to check if Firebase is enabled
export const isFirebaseEnabled = (): boolean => {
  return app !== null && auth !== null && db !== null;
};
