/**
 * Authentication Service
 * Login API removed: allows login with any email and random password
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, getDocs, collection, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db, isFirebaseEnabled } from '../config/firebase';
import { User } from '../types';

const STORAGE_KEY = 'zoopiter_active_user';

/**
 * Ensures background Firebase Auth session is active so Firestore security rules pass
 */
export const ensureFirebaseAuth = async (): Promise<boolean> => {
  if (!isFirebaseEnabled() || !auth) return false;
  if (auth.currentUser) return true;

  try {
    await signInWithEmailAndPassword(auth, 'admin@zoopiter.com', 'admin123456');
    return true;
  } catch (err: any) {
    if (
      err?.code === 'auth/user-not-found' ||
      err?.code === 'auth/invalid-credential' ||
      err?.code === 'auth/invalid-login-credentials'
    ) {
      try {
        await createUserWithEmailAndPassword(auth, 'admin@zoopiter.com', 'admin123456');
        return true;
      } catch {
        // Ignored
      }
    }
    return false;
  }
};

/**
 * Find user in Firestore by email
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  const normalized = email.trim().toLowerCase();
  if (!isFirebaseEnabled() || !db) return null;

  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    for (const d of usersSnapshot.docs) {
      const data = d.data();
      if (data.email && data.email.toLowerCase() === normalized) {
        return {
          id: d.id,
          ...data
        } as User;
      }
    }
  } catch (error) {
    console.warn('Could not query users from Firestore:', error);
  }
  return null;
};

/**
 * Login user - Login API authentication check removed!
 * Accepts any password (including random passwords) and logs the user in.
 */
export const loginUser = async (
  email: string,
  _password?: string,
  preferredRole?: 'admin' | 'sales'
): Promise<User | null> => {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter an email address.');
  }

  // Ensure background Firebase connection is active so Firestore works
  await ensureFirebaseAuth();

  // Look for existing user in Firestore
  let user = await findUserByEmail(cleanEmail);

  if (!user) {
    // Determine role: use preferred role, or check if email contains admin/cso/manager
    const defaultRole: 'admin' | 'sales' = preferredRole
      ? preferredRole
      : (cleanEmail.includes('admin') || cleanEmail.includes('cso') || cleanEmail.includes('manager')
        ? 'admin'
        : 'sales');

    const rawName = cleanEmail.split('@')[0];
    const formattedName = rawName
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const uid = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

    user = {
      id: uid,
      name: formattedName || 'User',
      email: cleanEmail,
      role: defaultRole,
      phone: '',
      department: defaultRole === 'admin' ? 'Management' : 'Sales'
    };

    // Save newly created user to Firestore so they are visible to the team
    if (isFirebaseEnabled() && db) {
      try {
        await setDoc(doc(db, 'users', uid), {
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone || '',
          department: user.department || '',
          createdAt: Timestamp.now()
        });
      } catch (err) {
        console.warn('Could not save user to Firestore:', err);
      }
    }
  }

  // Save active user to localStorage for session persistence
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

  return user;
};

/**
 * Get current active user from local storage
 */
export const getActiveUser = (): User | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Logout current user
 */
export const logoutUser = async (): Promise<void> => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error: any) {
    console.error('❌ [AUTH] Logout failed:', error.message);
  }
};

/**
 * Get current authenticated user (Firebase Auth)
 */
export const getCurrentUser = (): FirebaseUser | null => {
  if (!isFirebaseEnabled() || !auth) {
    return null;
  }
  return auth.currentUser;
};

/**
 * Subscribe to authentication state changes
 */
export const onAuthChange = (callback: (user: FirebaseUser | null) => void) => {
  if (!isFirebaseEnabled() || !auth) {
    callback(null);
    return () => {};
  }
  return auth.onAuthStateChanged(callback);
};

/**
 * Get user data from Firestore by UID
 */
export const getUserData = async (uid: string): Promise<User | null> => {
  if (!isFirebaseEnabled() || !db) {
    return null;
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      return null;
    }
    return { ...userDoc.data() as User, id: uid };
  } catch (error: any) {
    console.error('❌ [AUTH] Failed to get user data:', error.message);
    return null;
  }
};

/**
 * Ensures user data exists in Firestore
 */
export const ensureUserDataExists = async (
  firebaseUser: FirebaseUser,
  defaultRole: 'admin' | 'sales' = 'sales'
): Promise<User | null> => {
  if (!isFirebaseEnabled() || !db) {
    return null;
  }

  try {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      return { ...userDoc.data() as User, id: firebaseUser.uid };
    }

    const newUserData: Omit<User, 'id'> = {
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      email: firebaseUser.email || '',
      role: defaultRole,
      phone: firebaseUser.phoneNumber || ''
    };

    await setDoc(userDocRef, {
      ...newUserData,
      createdAt: Timestamp.now()
    });

    return { ...newUserData, id: firebaseUser.uid };
  } catch (error: any) {
    console.error('❌ [AUTH] Failed to ensure user data exists:', error.message);
    return null;
  }
};
