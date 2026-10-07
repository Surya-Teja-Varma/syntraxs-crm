/**
 * Lead Service
 * Handles lead CRUD operations with Firestore
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
import { Lead } from '../types';

const COLLECTION_NAME = 'leads';

const guardFirebase = () => !isFirebaseEnabled() || !db ? false : true;

/**
 * Get all leads
 */
export const getAllLeads = async (): Promise<Lead[]> => {
  if (!guardFirebase()) return [];
  try {
    const leadsSnapshot = await getDocs(collection(db!, COLLECTION_NAME));
    const leads = leadsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Lead));


    return leads;
  } catch (error: any) {
    console.error('❌ [LEADS] Failed to fetch leads:', error.message);
    return [];
  }
};

/**
 * Get lead by ID
 */
export const getLeadById = async (leadId: string): Promise<Lead | null> => {
  if (!guardFirebase()) return null;
  try {
    const leadDoc = await getDoc(doc(db!, COLLECTION_NAME, leadId));

    if (!leadDoc.exists()) {
      return null;
    }

    return { id: leadDoc.id, ...leadDoc.data() } as Lead;
  } catch (error: any) {
    console.error('❌ [LEADS] Failed to fetch lead:', error.message);
    return null;
  }
};

/**
 * Get leads assigned to a specific user
 */
export const getLeadsByUser = async (userId: string): Promise<Lead[]> => {
  if (!guardFirebase()) return [];
  try {
    const q = query(
      collection(db!, COLLECTION_NAME),
      where('assignedTo', '==', userId)
    );

    const leadsSnapshot = await getDocs(q);
    const leads = leadsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Lead));


    return leads;
  } catch (error: any) {
    console.error('❌ [LEADS] Failed to fetch user leads:', error.message);
    return [];
  }
};

/**
 * Add new lead
 */
export const addLead = async (leadData: Omit<Lead, 'id'>): Promise<string | null> => {
  if (!guardFirebase()) return null;
  try {
    const docRef = await addDoc(collection(db!, COLLECTION_NAME), {
      ...leadData,
      createdAt: leadData.createdAt || new Date().toISOString(),
      callHistory: leadData.callHistory || [],
      productsOffered: leadData.productsOffered || [],
      notes: leadData.notes || '',
      timestamp: Timestamp.now()
    });


    return docRef.id;
  } catch (error: any) {
    console.error('❌ [LEADS] Failed to create lead:', error.message);
    return null;
  }
};

/**
 * Update lead
 */
export const updateLead = async (leadId: string, updates: Partial<Lead>): Promise<boolean> => {
  if (!guardFirebase()) return false;
  try {
    await updateDoc(doc(db!, COLLECTION_NAME, leadId), {
      ...updates,
      updatedAt: Timestamp.now()
    });


    return true;
  } catch (error: any) {
    console.error('❌ [LEADS] Failed to update lead:', error.message);
    return false;
  }
};

/**
 * Delete lead
 */
export const deleteLead = async (leadId: string): Promise<boolean> => {
  if (!guardFirebase()) return false;
  try {
    await deleteDoc(doc(db!, COLLECTION_NAME, leadId));

    return true;
  } catch (error: any) {
    console.error('❌ [LEADS] Failed to delete lead:', error.message);
    return false;
  }
};

/**
 * Subscribe to leads collection changes (real-time)
 * Optimized with query limit and caching
 */
export const subscribeToLeads = (callback: (leads: Lead[]) => void) => {
  if (!guardFirebase()) return () => { };

  // Query optimized: order by createdAt descending for recent leads first
  // This allows faster initial rendering as most recent leads are fetched first
  const q = query(
    collection(db!, COLLECTION_NAME),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    // Use docChanges() for incremental updates instead of rebuilding entire array
    const leads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Lead));


    callback(leads);
  }, (error) => {
    console.error('❌ [LEADS] Subscription error:', error.message);
  });
};

/**
 * Subscribe to leads for specific user (real-time)
 */
export const subscribeToUserLeads = (userId: string, callback: (leads: Lead[]) => void) => {
  if (!guardFirebase()) return () => { };
  const q = query(
    collection(db!, COLLECTION_NAME),
    where('assignedTo', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const leads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Lead));


    callback(leads);
  }, (error) => {
    console.error('❌ [LEADS] Subscription error:', error.message);
  });
};
