/**
 * Target Service
 * Handles target CRUD operations with Firestore
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp
} from 'firebase/firestore';
import { db, isFirebaseEnabled } from '../config/firebase';
import { Target } from '../types';

const COLLECTION_NAME = 'targets';

const guardFirebase = () => !isFirebaseEnabled() || !db ? false : true;

/**
 * Get all targets
 */
export const getAllTargets = async (): Promise<Target[]> => {
  if (!guardFirebase()) return [];
  try {
    const targetsSnapshot = await getDocs(collection(db!, COLLECTION_NAME));
    const targets = targetsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Target));


    return targets;
  } catch (error: any) {
    console.error('❌ [TARGETS] Failed to fetch targets:', error.message);
    return [];
  }
};

/**
 * Get target by ID
 */
export const getTargetById = async (targetId: string): Promise<Target | null> => {
  if (!guardFirebase()) return null;
  try {
    const targetDoc = await getDoc(doc(db!, COLLECTION_NAME, targetId));

    if (!targetDoc.exists()) {
      return null;
    }

    return { id: targetDoc.id, ...targetDoc.data() } as Target;
  } catch (error: any) {
    console.error('❌ [TARGETS] Failed to fetch target:', error.message);
    return null;
  }
};

/**
 * Get targets for a specific user
 */
export const getTargetsByUser = async (userId: string): Promise<Target[]> => {
  if (!guardFirebase()) return [];
  try {
    const q = query(
      collection(db!, COLLECTION_NAME),
      where('userId', '==', userId)
    );

    const targetsSnapshot = await getDocs(q);
    const targets = targetsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Target));


    return targets;
  } catch (error: any) {
    console.error('❌ [TARGETS] Failed to fetch user targets:', error.message);
    return [];
  }
};

/**
 * Add new target
 */
export const addTarget = async (targetData: Omit<Target, 'id' | 'achieved'>): Promise<string | null> => {
  if (!guardFirebase()) return null;
  try {
    const docRef = await addDoc(collection(db!, COLLECTION_NAME), {
      ...targetData,
      achieved: 0,
      createdAt: Timestamp.now()
    });


    return docRef.id;
  } catch (error: any) {
    console.error('❌ [TARGETS] Failed to create target:', error.message);
    return null;
  }
};

/**
 * Update target
 */
export const updateTarget = async (targetId: string, updates: Partial<Target>): Promise<boolean> => {
  if (!guardFirebase()) return false;
  try {
    await updateDoc(doc(db!, COLLECTION_NAME, targetId), {
      ...updates,
      updatedAt: Timestamp.now()
    });


    return true;
  } catch (error: any) {
    console.error('❌ [TARGETS] Failed to update target:', error.message);
    return false;
  }
};

/**
 * Delete target
 */
export const deleteTarget = async (targetId: string): Promise<boolean> => {
  if (!guardFirebase()) return false;
  try {
    await deleteDoc(doc(db!, COLLECTION_NAME, targetId));

    return true;
  } catch (error: any) {
    console.error('❌ [TARGETS] Failed to delete target:', error.message);
    return false;
  }
};

/**
 * Subscribe to targets collection changes (real-time)
 */
export const subscribeToTargets = (callback: (targets: Target[]) => void) => {
  if (!guardFirebase()) return () => { };
  const q = query(collection(db!, COLLECTION_NAME), orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const targets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Target));


    callback(targets);
  }, (error) => {
    console.error('❌ [TARGETS] Subscription error:', error.message);
  });
};

/**
 * Subscribe to targets for specific user (real-time)
 */
export const subscribeToUserTargets = (userId: string, callback: (targets: Target[]) => void) => {
  if (!guardFirebase()) return () => { };
  const q = query(
    collection(db!, COLLECTION_NAME),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const targets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Target));


    callback(targets);
  }, (error) => {
    console.error('❌ [TARGETS] Subscription error:', error.message);
  });
};
