/**
 * Custom hook for Firebase data management
 * Handles real-time subscriptions and data synchronization
 */

import { useEffect } from 'react';
import { User, Lead, Target, Activity } from '../types';
import { isFirebaseEnabled } from '../config/firebase';
import { subscribeToUsers } from '../services/userService';
import { subscribeToLeads } from '../services/leadService';
import { subscribeToTargets } from '../services/targetService';
import { subscribeToActivities } from '../services/activityService';

interface UseFirebaseDataProps {
  setUsers: (users: User[]) => void;
  setLeads: (leads: Lead[]) => void;
  setTargets: (targets: Target[]) => void;
  setActivities: (activities: Activity[]) => void;
  currentUser?: User | null; // Add currentUser to check authentication
}

/**
 * Subscribe to all Firebase collections with real-time updates
 * Only starts subscriptions when user is authenticated
 */
export const useFirebaseData = ({
  setUsers,
  setLeads,
  setTargets,
  setActivities,
  currentUser
}: UseFirebaseDataProps) => {

  useEffect(() => {
    // Only subscribe if Firebase is enabled AND user is authenticated
    if (!isFirebaseEnabled() || !currentUser) {
      return;
    }



    // Subscribe to users collection
    const unsubscribeUsers = subscribeToUsers((users) => {
      setUsers(users);
    });

    // Subscribe to leads collection
    const unsubscribeLeads = subscribeToLeads((leads) => {
      setLeads(leads);
    });

    // Subscribe to targets collection
    const unsubscribeTargets = subscribeToTargets((targets) => {
      setTargets(targets);
    });

    // Subscribe to activities collection
    const unsubscribeActivities = subscribeToActivities((activities) => {
      setActivities(activities);
    });



    // Cleanup subscriptions on unmount or when user changes
    return () => {

      unsubscribeUsers();
      unsubscribeLeads();
      unsubscribeTargets();
      unsubscribeActivities();
    };
  }, [setUsers, setLeads, setTargets, setActivities, currentUser]); // Add currentUser as dependency
};
