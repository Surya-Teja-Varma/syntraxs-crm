/**
 * Activity Service
 * Handles activity CRUD operations with Firestore
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
  limit,
  Timestamp
} from 'firebase/firestore';
import { db, isFirebaseEnabled } from '../config/firebase';
import { Activity } from '../types';

const COLLECTION_NAME = 'activities';

const guardFirebase = () => !isFirebaseEnabled() || !db ? false : true;

/**
 * Get all activities
 */
export const getAllActivities = async (): Promise<Activity[]> => {
  if (!guardFirebase()) return [];
  try {
    const activitiesSnapshot = await getDocs(
      query(collection(db!, COLLECTION_NAME), orderBy('timestamp', 'desc'))
    );
    const activities = activitiesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Activity));


    return activities;
  } catch (error: any) {
    console.error('❌ [ACTIVITIES] Failed to fetch activities:', error.message);
    return [];
  }
};

/**
 * Get activity by ID
 */
export const getActivityById = async (activityId: string): Promise<Activity | null> => {
  if (!guardFirebase()) return null;
  try {
    const activityDoc = await getDoc(doc(db!, COLLECTION_NAME, activityId));

    if (!activityDoc.exists()) {
      return null;
    }

    return { id: activityDoc.id, ...activityDoc.data() } as Activity;
  } catch (error: any) {
    console.error('❌ [ACTIVITIES] Failed to fetch activity:', error.message);
    return null;
  }
};

/**
 * Get activities for a specific user
 */
export const getActivitiesByUser = async (userId: string, limitCount?: number): Promise<Activity[]> => {
  if (!guardFirebase()) return [];
  try {
    let q = query(
      collection(db!, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const activitiesSnapshot = await getDocs(q);
    const activities = activitiesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Activity));


    return activities;
  } catch (error: any) {
    console.error('❌ [ACTIVITIES] Failed to fetch user activities:', error.message);
    return [];
  }
};

/**
 * Get activities for a specific lead
 */
export const getActivitiesByLead = async (leadId: string): Promise<Activity[]> => {
  if (!guardFirebase()) return [];
  try {
    const q = query(
      collection(db!, COLLECTION_NAME),
      where('leadId', '==', leadId)
    );

    const activitiesSnapshot = await getDocs(q);
    const activities = activitiesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Activity))
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA; // desc order
      });


    return activities;
  } catch (error: any) {
    console.error('❌ [ACTIVITIES] Failed to fetch lead activities:', error.message);
    return [];
  }
};

/**
 * Add new activity
 */
export const addActivity = async (activityData: Omit<Activity, 'id' | 'timestamp'>): Promise<string | null> => {
  if (!guardFirebase()) return null;
  try {
    const docRef = await addDoc(collection(db!, COLLECTION_NAME), {
      ...activityData,
      timestamp: new Date().toISOString(),
      createdAt: Timestamp.now()
    });


    return docRef.id;
  } catch (error: any) {
    console.error('❌ [ACTIVITIES] Failed to create activity:', error.message);
    return null;
  }
};

/**
 * Update activity
 */
export const updateActivity = async (activityId: string, updates: Partial<Activity>): Promise<boolean> => {
  if (!guardFirebase()) return false;
  try {
    await updateDoc(doc(db!, COLLECTION_NAME, activityId), {
      ...updates,
      updatedAt: Timestamp.now()
    });


    return true;
  } catch (error: any) {
    console.error('❌ [ACTIVITIES] Failed to update activity:', error.message);
    return false;
  }
};

/**
 * Delete activity
 */
export const deleteActivity = async (activityId: string): Promise<boolean> => {
  if (!guardFirebase()) return false;
  try {
    await deleteDoc(doc(db!, COLLECTION_NAME, activityId));

    return true;
  } catch (error: any) {
    console.error('❌ [ACTIVITIES] Failed to delete activity:', error.message);
    return false;
  }
};

/**
 * Subscribe to activities collection changes (real-time)
 */
export const subscribeToActivities = (callback: (activities: Activity[]) => void) => {
  if (!guardFirebase()) return () => { };
  const q = query(collection(db!, COLLECTION_NAME), orderBy('timestamp', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const activities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Activity));


    callback(activities);
  }, (error) => {
    console.error('❌ [ACTIVITIES] Subscription error:', error.message);
  });
};

/**
 * Subscribe to activities for specific user (real-time)
 */
export const subscribeToUserActivities = (userId: string, callback: (activities: Activity[]) => void) => {
  if (!guardFirebase()) return () => { };
  const q = query(
    collection(db!, COLLECTION_NAME),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const activities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Activity));


    callback(activities);
  }, (error) => {
    console.error('❌ [ACTIVITIES] Subscription error:', error.message);
  });
};
