import { useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from './ui/popover';
import { Lead, User } from '../types';
import { formatDate } from '../utils/helpers';

interface NotificationBellProps {
    leads: Lead[];
    currentUser: User;
    onUpdateLead?: (leadId: string, updates: Partial<Lead>) => void;
}

interface UpcomingFollowUp {
    lead: Lead;
    minutesRemaining: number;
}

interface OverdueFollowUp {
    lead: Lead;
    reason: 'dismissed' | 'no_action';
}

export function NotificationBell({ leads, currentUser, onUpdateLead }: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Filter leads based on user role and find upcoming follow-ups
    const upcomingFollowUps = useMemo(() => {
        const now = new Date();
        const FIVE_MINUTES = 5 * 60 * 1000; // 300,000 milliseconds

        // Filter leads based on role
        const relevantLeads = currentUser.role === 'admin'
            ? leads // Admin sees all follow-ups
            : leads.filter(lead => lead.assignedTo === currentUser.id); // Sales sees only their own

        const upcoming: UpcomingFollowUp[] = [];

        relevantLeads.forEach(lead => {
            if (!lead.nextFollowUp) return;

            // Skip if already completed or overdue
            if (lead.followUpStatus === 'completed' || lead.followUpStatus === 'overdue') {
                return;
            }

            const followUpTime = new Date(lead.nextFollowUp);
            const diff = followUpTime.getTime() - now.getTime();

            // Check if follow-up is within the next 5 minutes
            const isUpcoming = diff > 0 && diff <= FIVE_MINUTES;

            if (isUpcoming) {
                const minutesRemaining = Math.ceil(diff / 60000);
                upcoming.push({ lead, minutesRemaining });
            }
        });

        // Sort by time remaining (most urgent first)
        return upcoming.sort((a, b) => a.minutesRemaining - b.minutesRemaining);
    }, [leads, currentUser.id, currentUser.role]);

    // Find overdue follow-ups
    const overdueFollowUps = useMemo(() => {
        // Filter leads based on role
        const relevantLeads = currentUser.role === 'admin'
            ? leads // Admin sees all overdue
            : leads.filter(lead => lead.assignedTo === currentUser.id); // Sales sees only their own

        const overdue: OverdueFollowUp[] = [];

        relevantLeads.forEach(lead => {
            if (lead.followUpStatus === 'overdue' && lead.followUpOverdueReason) {
                overdue.push({
                    lead,
                    reason: lead.followUpOverdueReason
                });
            }
        });

        return overdue;
    }, [leads, currentUser.id, currentUser.role]);

    const totalCount = upcomingFollowUps.length + overdueFollowUps.length;

    const getOverdueReasonText = (reason: 'dismissed' | 'no_action') => {
        return reason === 'dismissed' ? 'Dismissed by Sales' : 'No Action Taken';
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    className="relative rounded-full h-9 w-9 p-0 text-foreground"
                >
                    <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    {totalCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute top-2 right-2 h-4 w-4 flex items-center justify-center p-0 text-[10px] rounded-full border-2 border-background z-10 translate-x-1/2 -translate-y-1/2"
                        >
                            {totalCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96" align="end">
                <div className="space-y-4">
                    <h4 className="font-semibold text-sm">Notifications</h4>

                    {totalCount === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            No notifications
                        </p>
                    ) : (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {/* Upcoming Follow-ups Section */}
                            {upcomingFollowUps.length > 0 && (
                                <div className="space-y-2">
                                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        Upcoming Follow-ups ({upcomingFollowUps.length})
                                    </h5>
                                    <div className="space-y-2">
                                        {upcomingFollowUps.map(({ lead, minutesRemaining }) => (
                                            <div
                                                key={lead.id}
                                                className="p-3 border rounded-lg space-y-1 bg-card hover:bg-accent transition-colors"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{lead.companyName}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Contact: {lead.contactName}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Phone: {lead.phone}
                                                        </p>
                                                        {currentUser.role === 'admin' && lead.assignedToName && (
                                                            <p className="text-xs text-muted-foreground">
                                                                Assigned to: {lead.assignedToName}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Badge variant="default" className="text-xs bg-blue-500">
                                                        {minutesRemaining} min
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-muted-foreground pt-1 border-t">
                                                    Follow-up: {formatDate(lead.nextFollowUp)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Overdue Follow-ups Section */}
                            {overdueFollowUps.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-xs font-semibold text-destructive uppercase tracking-wide">
                                            Overdue Follow-ups ({overdueFollowUps.length})
                                        </h5>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto text-xs text-muted-foreground hover:text-destructive p-0"
                                            onClick={() => {
                                                if (onUpdateLead) {
                                                    overdueFollowUps.forEach(item => {
                                                        onUpdateLead(item.lead.id, {
                                                            followUpStatus: 'completed',
                                                            followUpCompletedAt: new Date().toISOString()
                                                        });
                                                    });
                                                }
                                            }}
                                        >
                                            Clear all
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {overdueFollowUps.map(({ lead, reason }) => (
                                            <div
                                                key={lead.id}
                                                className="p-3 border border-destructive/50 rounded-lg space-y-1 bg-destructive/5 hover:bg-destructive/10 transition-colors relative group"
                                            >
                                                <div className="flex items-start justify-between pr-6">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{lead.companyName}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Contact: {lead.contactName}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Phone: {lead.phone}
                                                        </p>
                                                        {currentUser.role === 'admin' && lead.assignedToName && (
                                                            <p className="text-xs text-muted-foreground">
                                                                Sales: {lead.assignedToName}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Badge variant="destructive" className="text-xs">
                                                        Overdue
                                                    </Badge>
                                                </div>
                                                <div className="text-xs pt-1 border-t border-destructive/30">
                                                    <p className="text-muted-foreground">
                                                        Scheduled: {formatDate(lead.nextFollowUp)}
                                                    </p>
                                                    <p className="text-destructive font-medium mt-1">
                                                        Reason: {getOverdueReasonText(reason)}
                                                    </p>
                                                </div>

                                                {/* Clear Button */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-6 w-6 text-destructive/50 hover:text-destructive hover:bg-destructive/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e: React.MouseEvent) => {
                                                        e.stopPropagation();
                                                        onUpdateLead?.(lead.id, {
                                                            followUpStatus: 'completed',
                                                            followUpCompletedAt: new Date().toISOString()
                                                        });
                                                    }}
                                                    title="Clear notification"
                                                >
                                                    <span className="sr-only">Clear</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
