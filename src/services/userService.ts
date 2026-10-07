/**
 * User Service
 * Handles user CRUD operations with Firestore
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth, db, isFirebaseEnabled } from '../config/firebase';
import { User } from '../types';

const COLLECTION_NAME = 'users';

// Guard function to check Firebase is enabled
const guardFirebase = () => {
  if (!isFirebaseEnabled() || !auth || !db) {

    return false;
  }
  return true;
};

/**
 * Check if a user exists with the given email
 */
export const checkUserExists = async (email: string): Promise<boolean> => {
  if (!guardFirebase()) return false;

  try {
    // Check if the email is registered with Firebase Authentication
    const signInMethods = await fetchSignInMethodsForEmail(auth!, email);
    return signInMethods.length > 0;
  } catch (error: any) {
    console.error('❌ [USERS] Error checking user existence:', error.message);
    return false;
  }
};

/**
 * Get all users
 */
export const getAllUsers = async (): Promise<User[]> => {
  if (!guardFirebase()) return [];

  try {
    const usersSnapshot = await getDocs(collection(db!, COLLECTION_NAME));
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as User));


    return users;
  } catch (error: any) {
    console.error('❌ [USERS] Failed to fetch users:', error.message);
    return [];
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  if (!guardFirebase()) return null;

  try {
    const userDoc = await getDoc(doc(db!, COLLECTION_NAME, userId));

    if (!userDoc.exists()) {
      return null;
    }

    return { id: userDoc.id, ...userDoc.data() } as User;
  } catch (error: any) {
    console.error('❌ [USERS] Failed to fetch user:', error.message);
    return null;
  }
};

/**
 * Add new user (Admin function)
 */
export const addUser = async (userData: Omit<User, 'id'>): Promise<string | null> => {
  if (!guardFirebase()) return null;

  try {
    // Get password from userData or use default
    const password = userData.password || 'changeme123';

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth!,
      userData.email,
      password
    );

    const uid = userCredential.user.uid;

    // Add user data to Firestore using the same UID
    await setDoc(doc(db!, COLLECTION_NAME, uid), {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      phone: userData.phone || '',
      department: userData.department || '',
      createdAt: Timestamp.now()
    });


    return uid;
  } catch (error: any) {
    console.error('❌ [USERS] Failed to create user:', error.message);
    return null;
  }
};

/**
 * Update user
 */
export const updateUser = async (userId: string, updates: Partial<User>): Promise<boolean> => {
  if (!guardFirebase()) return false;

  try {
    await updateDoc(doc(db!, COLLECTION_NAME, userId), {
      ...updates,
      updatedAt: Timestamp.now()
    });


    return true;
  } catch (error: any) {
    console.error('❌ [USERS] Failed to update user:', error.message);
    return false;
  }
};

/**
 * Delete user
 */
export const deleteUser = async (userId: string): Promise<boolean> => {
  if (!guardFirebase()) return false;

  try {
    await deleteDoc(doc(db!, COLLECTION_NAME, userId));

    return true;
  } catch (error: any) {
    console.error('❌ [USERS] Failed to delete user:', error.message);
    return false;
  }
};

/**
 * Subscribe to users collection changes (real-time)
 */
export const subscribeToUsers = (callback: (users: User[]) => void) => {
  if (!guardFirebase()) return () => { };

  const q = query(collection(db!, COLLECTION_NAME), orderBy('name'));

  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as User));


    callback(users);
  }, (error) => {
    console.error('❌ [USERS] Subscription error:', error.message);
  });
};
