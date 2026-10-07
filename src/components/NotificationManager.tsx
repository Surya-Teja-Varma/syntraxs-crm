import { useEffect, useRef, useState, useMemo } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../config/firebase';
import { Lead, User } from '../types';
import { toast } from 'sonner';
import { FollowUpReminderPopup } from './FollowUpReminderPopup';

interface NotificationManagerProps {
    leads: Lead[];
    currentUser: User;
    onUpdateLead: (leadId: string, updates: Partial<Lead>) => void;
}

interface ActiveReminder {
    lead: Lead;
    minutesRemaining: number;
}

export function NotificationManager({ leads, currentUser, onUpdateLead }: NotificationManagerProps) {
    const notificationInterval = useRef<NodeJS.Timeout | null>(null);
    const remindedLeads = useRef<Set<string>>(new Set());
    const [activeReminder, setActiveReminder] = useState<ActiveReminder | null>(null);

    // Filter leads based on user role
    const relevantLeads = useMemo(() => {
        if (currentUser.role === 'admin') {
            return leads; // Admin sees all follow-ups (acts as Sales Manager)
        }
        // Sales members only see their own follow-ups
        return leads.filter(lead => lead.assignedTo === currentUser.id);
    }, [leads, currentUser.id, currentUser.role]);

    // 1. Request Permission & Setup FCM
    useEffect(() => {
        const requestPermission = async () => {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {


                    // Get FCM Token
                    if (messaging) {
                        try {
                            const currentToken = await getToken(messaging, {
                                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
                            });
                            if (currentToken) {

                            }
                        } catch (err) {

                        }
                    }
                } else {

                }
            } catch (error) {
                console.error('❌ [Notification] Error requesting permission:', error);
            }
        };

        requestPermission();
    }, []);

    // 2. Listen for Foreground FCM Messages
    useEffect(() => {
        if (messaging) {
            const unsubscribe = onMessage(messaging, (payload) => {

                const { title, body } = payload.notification || {};

                // Show System Notification
                if (Notification.permission === 'granted') {
                    new Notification(title || 'New Message', {
                        body: body,
                        icon: '/logo.png'
                    });
                }

                // Also show in-app toast
                toast.info(title || 'New Message', {
                    description: body,
                });
            });

            return () => unsubscribe();
        }
    }, []);

    // Clear reminder tracking when leads' follow-up times change
    useEffect(() => {
        const followUpMap = new Map<string, string | undefined>();
        relevantLeads.forEach(lead => {
            followUpMap.set(lead.id, lead.nextFollowUp);
        });

        // Clear reminded status for leads that no longer exist or have been reset
        const toRemove: string[] = [];
        remindedLeads.current.forEach(leadId => {
            const currentLead = relevantLeads.find(l => l.id === leadId);
            // Remove if lead is gone OR if follow-up status is not 'reminded' anymore (e.g. reset to pending)
            if (!currentLead || currentLead.followUpStatus !== 'reminded') {
                toRemove.push(leadId);
            }
        });

        toRemove.forEach(id => remindedLeads.current.delete(id));
    }, [relevantLeads]);

    // Handle "Called" action
    const handleCalled = () => {
        if (!activeReminder) return;

        const { lead } = activeReminder;


        // Update lead status to completed
        onUpdateLead(lead.id, {
            followUpStatus: 'completed',
            followUpCompletedAt: new Date().toISOString()
        });

        // Close the reminder popup
        setActiveReminder(null);

        // Show success toast
        toast.success('Follow-up marked as completed');
    };

    // Handle "Dismiss" action
    const handleDismiss = () => {
        if (!activeReminder) return;

        const { lead } = activeReminder;


        // Update lead status to overdue with reason "dismissed"
        onUpdateLead(lead.id, {
            followUpStatus: 'overdue',
            followUpOverdueReason: 'dismissed'
        });

        // Close the reminder popup
        setActiveReminder(null);

        // Show warning toast
        toast.warning('Follow-up marked as overdue (dismissed)');
    };

    // Handle auto-expire (no action taken)
    const handleAutoExpire = () => {
        if (!activeReminder) return;

        const { lead } = activeReminder;


        // Update lead status to overdue with reason "no_action"
        onUpdateLead(lead.id, {
            followUpStatus: 'overdue',
            followUpOverdueReason: 'no_action'
        });

        // Close the reminder popup
        setActiveReminder(null);

        // Show error toast
        toast.error('Follow-up marked as overdue (no action taken)');
    };

    // 3. Poll for Follow-ups (Local System)
    useEffect(() => {
        const checkFollowUps = () => {
            const now = new Date();
            const FIVE_MINUTES = 5 * 60 * 1000; // 300,000 milliseconds

            relevantLeads.forEach(lead => {
                if (!lead.nextFollowUp) return;

                // Skip if already reminded, completed, or overdue
                if (lead.followUpStatus === 'reminded' ||
                    lead.followUpStatus === 'completed' ||
                    lead.followUpStatus === 'overdue') {
                    return;
                }

                const followUpTime = new Date(lead.nextFollowUp);
                const diff = followUpTime.getTime() - now.getTime();

                // Trigger notification 5 minutes before the follow-up time
                const isUpcoming = diff > 0 && diff <= FIVE_MINUTES;

                if (isUpcoming && !remindedLeads.current.has(lead.id)) {
                    const minutesRemaining = Math.ceil(diff / 60000);


                    // Update lead status to "reminded"
                    onUpdateLead(lead.id, {
                        followUpStatus: 'reminded',
                        followUpRemindedAt: new Date().toISOString()
                    });

                    // Show custom in-app reminder popup
                    setActiveReminder({ lead, minutesRemaining });

                    // Also trigger Desktop Notification (browser native)
                    if (Notification.permission === 'granted') {
                        const n = new Notification(`🔔 Follow-up Reminder: ${lead.companyName}`, {
                            body: `Follow-up in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}\\nContact: ${lead.contactName}\\nPhone: ${lead.phone}`,
                            icon: '/logo.png',
                            tag: `followup-${lead.id}`,
                            requireInteraction: true
                        });
                        n.onclick = () => window.focus();
                    }

                    // Mark as reminded so we don't spam every poll cycle
                    remindedLeads.current.add(lead.id);
                }
            });
        };

        // Run check immediately
        checkFollowUps();

        // Then run every 10 seconds
        notificationInterval.current = setInterval(checkFollowUps, 10000);

        return () => {
            if (notificationInterval.current) {
                clearInterval(notificationInterval.current);
            }
        };
    }, [relevantLeads, onUpdateLead]);

    return (
        <>
            {activeReminder && (
                <FollowUpReminderPopup
                    lead={activeReminder.lead}
                    minutesRemaining={activeReminder.minutesRemaining}
                    onCalled={handleCalled}
                    onDismiss={handleDismiss}
                    onAutoExpire={handleAutoExpire}
                />
            )}
        </>
    );
}
