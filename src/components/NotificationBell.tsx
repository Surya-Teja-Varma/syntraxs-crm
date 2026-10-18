import { useMemo, useState } from 'react';
import {
  Bell, Volume2, Lightbulb, Play, Check, Settings, Sparkles, Phone, X, Clock, AlertTriangle,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Lead, User } from '../types';
import { formatDate } from '../utils/helpers';
import { soundService, SOUND_PRESETS, playNotificationSound } from '../utils/soundService';
import { toast } from 'sonner';

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
  const [activeTab, setActiveTab] = useState<'all' | 'interested' | 'followups' | 'sounds'>('all');
  const [showAllItems, setShowAllItems] = useState(false);
  const [selectedSound, setSelectedSound] = useState(() => soundService.getSelectedPresetId());
  const [playingPresetId, setPlayingPresetId] = useState<string | null>(null);

  // Filter leads based on user role and find upcoming follow-ups
  const upcomingFollowUps = useMemo(() => {
    const now = new Date();
    const FIVE_MINUTES = 5 * 60 * 1000;

    const relevantLeads = currentUser.role === 'admin'
      ? leads
      : leads.filter((lead) => lead.assignedTo === currentUser.id);

    const upcoming: UpcomingFollowUp[] = [];

    relevantLeads.forEach((lead) => {
      if (!lead.nextFollowUp) return;
      if (lead.followUpStatus === 'completed' || lead.followUpStatus === 'overdue') return;

      const followUpTime = new Date(lead.nextFollowUp);
      const diff = followUpTime.getTime() - now.getTime();

      if (diff > 0 && diff <= FIVE_MINUTES) {
        const minutesRemaining = Math.ceil(diff / 60000);
        upcoming.push({ lead, minutesRemaining });
      }
    });

    return upcoming.sort((a, b) => a.minutesRemaining - b.minutesRemaining);
  }, [leads, currentUser.id, currentUser.role]);

  // Find overdue follow-ups
  const overdueFollowUps = useMemo(() => {
    const relevantLeads = currentUser.role === 'admin'
      ? leads
      : leads.filter((lead) => lead.assignedTo === currentUser.id);

    const overdue: OverdueFollowUp[] = [];

    relevantLeads.forEach((lead) => {
      if (lead.followUpStatus === 'overdue' && lead.followUpOverdueReason) {
        overdue.push({
          lead,
          reason: lead.followUpOverdueReason,
        });
      }
    });

    return overdue;
  }, [leads, currentUser.id, currentUser.role]);

  // Find interested leads for Admin
  const interestedLeads = useMemo(() => {
    if (currentUser.role !== 'admin') return [];
    return leads
      .filter((lead) => lead.status === 'interested')
      .sort((a, b) => {
        const tA = a.interestedAt ? new Date(a.interestedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const tB = b.interestedAt ? new Date(b.interestedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return tB - tA;
      });
  }, [leads, currentUser.role]);

  const totalCount = upcomingFollowUps.length + overdueFollowUps.length + interestedLeads.length;

  const handleSelectSound = (presetId: string, presetName: string, icon: string) => {
    soundService.setSelectedPresetId(presetId);
    setSelectedSound(presetId);
    soundService.playPreset(presetId);
    setPlayingPresetId(presetId);
    setTimeout(() => setPlayingPresetId(null), 1200);
    toast.success(`Active tone set: ${icon} ${presetName}`, {
      description: "Incoming 'Interested' client alerts will play this sound.",
      duration: 3500,
    });
  };

  const handlePreviewSound = (e: React.MouseEvent, presetId: string) => {
    e.stopPropagation();
    soundService.playPreset(presetId);
    setPlayingPresetId(presetId);
    setTimeout(() => setPlayingPresetId(null), 1200);
  };

  const handleClearAllOverdue = () => {
    if (onUpdateLead) {
      overdueFollowUps.forEach((item) => {
        onUpdateLead(item.lead.id, {
          followUpStatus: 'completed',
          followUpCompletedAt: new Date().toISOString(),
        });
      });
      toast.success('All overdue follow-ups cleared');
    }
  };

  // Compile unified list
  const allNotifications = [
    ...interestedLeads.map((lead) => ({
      type: 'interested' as const,
      id: `interest-${lead.id}`,
      lead,
      title: lead.companyName || 'Unknown Company',
      subtitle: `Contact: ${lead.contactName || 'Client'} · ${lead.phone || 'No phone'}`,
      rep: lead.interestedByName || lead.assignedToName || 'Sales Rep',
      time: lead.interestedAt
        ? new Date(lead.interestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Recent',
    })),
    ...upcomingFollowUps.map(({ lead, minutesRemaining }) => ({
      type: 'upcoming' as const,
      id: `upcoming-${lead.id}`,
      lead,
      title: lead.companyName || 'Unknown Company',
      subtitle: `Contact: ${lead.contactName || 'Client'} · ${lead.phone || 'No phone'}`,
      rep: lead.assignedToName || 'Sales Rep',
      time: `in ${minutesRemaining}m`,
    })),
    ...overdueFollowUps.map(({ lead, reason }) => ({
      type: 'overdue' as const,
      id: `overdue-${lead.id}`,
      lead,
      title: lead.companyName || 'Unknown Company',
      subtitle: `Overdue (${reason === 'dismissed' ? 'Dismissed' : 'No action'})`,
      rep: lead.assignedToName || 'Sales Rep',
      time: 'Overdue',
    })),
  ];

  const filteredNotifications = allNotifications.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'interested') return item.type === 'interested';
    if (activeTab === 'followups') return item.type === 'upcoming' || item.type === 'overdue';
    return true;
  });

  const DISPLAY_LIMIT = 6;
  const visibleNotifications = showAllItems
    ? filteredNotifications
    : filteredNotifications.slice(0, DISPLAY_LIMIT);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="relative rounded-full h-9 w-9 p-0 text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-foreground" />
          {totalCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute top-2 right-2 h-4 w-4 flex items-center justify-center p-0 text-[10px] rounded-full border-2 border-background z-10 translate-x-1/2 -translate-y-1/2 animate-pulse"
            >
              {totalCount > 9 ? '9+' : totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-1.5rem)] sm:w-[420px] max-w-[420px] p-0 shadow-2xl rounded-xl overflow-hidden" align="end">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-muted/40 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm flex items-center gap-1.5">
              Notifications
              {totalCount > 0 && (
                <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 text-[10px] font-bold">
                  {totalCount}
                </Badge>
              )}
            </h4>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                soundService.playPreset(selectedSound);
                toast.info(`Playing sound: ${SOUND_PRESETS.find((p) => p.id === selectedSound)?.name || 'Chime'} 🔔`);
              }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded bg-secondary/70 hover:bg-secondary transition-colors"
              title="Test current alert sound"
            >
              <Volume2 className="h-3.5 w-3.5 text-primary" />
              <span>Test Sound</span>
            </button>
            {overdueFollowUps.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllOverdue}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors px-1 py-1"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-1 border-b bg-muted/20 px-2 py-1.5 text-xs font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors shrink-0 ${
              activeTab === 'all'
                ? 'bg-background text-foreground font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All <span className="text-[10px] opacity-70">({allNotifications.length})</span>
          </button>
          {interestedLeads.length > 0 && (
            <button
              onClick={() => setActiveTab('interested')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors shrink-0 ${
                activeTab === 'interested'
                  ? 'bg-amber-500/15 text-amber-700 font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Lightbulb className="h-3 w-3 text-amber-500" />
              Interested <span className="text-[10px] font-bold">({interestedLeads.length})</span>
            </button>
          )}
          {(upcomingFollowUps.length > 0 || overdueFollowUps.length > 0) && (
            <button
              onClick={() => setActiveTab('followups')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors shrink-0 ${
                activeTab === 'followups'
                  ? 'bg-background text-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="h-3 w-3 text-primary" />
              Follow-ups <span className="text-[10px] opacity-70">({upcomingFollowUps.length + overdueFollowUps.length})</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('sounds')}
            className={`ml-auto flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors shrink-0 ${
              activeTab === 'sounds'
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'text-primary hover:bg-primary/10'
            }`}
            title="6 notification sound options"
          >
            <Settings className="h-3 w-3" />
            <span>Sound Options (6)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="max-h-[380px] overflow-y-auto divide-y">
          {activeTab === 'sounds' ? (
            <div className="p-3 space-y-2.5">
              <div className="pb-1.5 border-b">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Select Alert Sound (6 Options)
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Choose the alert chime played when sales marks client interest
                </div>
              </div>

              <div className="space-y-1.5">
                {SOUND_PRESETS.map((preset) => {
                  const isSelected = selectedSound === preset.id;
                  const isPlaying = playingPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectSound(preset.id, preset.name, preset.icon)}
                      className={`group flex items-center justify-between gap-2.5 p-2 rounded-lg border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'border-primary/50 bg-primary/5 shadow-xs'
                          : 'border-border/60 hover:border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg select-none shrink-0">{preset.icon}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {preset.name}
                            </span>
                            {isSelected && (
                              <span className="flex items-center gap-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.2">
                                <Check className="h-2.5 w-2.5" /> Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {preset.description}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handlePreviewSound(e, preset.id)}
                        className={`flex h-7 w-7 items-center justify-center rounded-md border text-xs transition-transform active:scale-90 ${
                          isPlaying
                            ? 'bg-primary text-primary-foreground border-primary scale-105'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                        title={`Preview ${preset.name}`}
                        aria-label={`Preview ${preset.name}`}
                      >
                        <Play className={`h-3 w-3 ${isPlaying ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 text-center text-[11px] text-muted-foreground border-t">
                🔊 Audio works 100% in browser and saves your choice automatically.
              </div>
            </div>
          ) : visibleNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No notifications
            </p>
          ) : (
            <div className="divide-y">
              {visibleNotifications.map((item) => {
                const lead = item.lead;
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2.5 px-3.5 py-2.5 transition-colors ${
                      item.type === 'interested'
                        ? 'bg-amber-500/5 hover:bg-amber-500/10'
                        : item.type === 'overdue'
                        ? 'bg-destructive/5 hover:bg-destructive/10'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    <div
                      className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                        item.type === 'interested'
                          ? 'bg-amber-500/20 text-amber-600'
                          : item.type === 'overdue'
                          ? 'bg-destructive/15 text-destructive'
                          : 'bg-primary/15 text-primary'
                      }`}
                    >
                      {item.type === 'interested' ? (
                        <Lightbulb className="h-3.5 w-3.5" />
                      ) : item.type === 'overdue' ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate text-xs font-semibold text-foreground">
                          {item.title}
                        </span>
                        <span className="text-[10.5px] text-muted-foreground shrink-0 font-medium">
                          {item.time}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-muted-foreground truncate">
                        {item.subtitle}
                      </div>

                      {item.type === 'interested' && (
                        <div className="mt-1 flex items-center justify-between gap-1">
                          <span className="text-[11px] font-medium text-amber-700">
                            Marked by: <strong className="font-semibold">{item.rep}</strong>
                          </span>
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium shrink-0"
                            >
                              <Phone className="h-2.5 w-2.5" /> Call
                            </a>
                          )}
                        </div>
                      )}

                      {item.type === 'overdue' && (
                        <div className="mt-1 flex items-center justify-end">
                          <button
                            onClick={() => {
                              onUpdateLead?.(lead.id, {
                                followUpStatus: 'completed',
                                followUpCompletedAt: new Date().toISOString(),
                              });
                              toast.success('Follow-up marked resolved');
                            }}
                            className="text-[10.5px] font-semibold text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded bg-secondary transition-colors"
                          >
                            Mark resolved
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab !== 'sounds' && filteredNotifications.length > DISPLAY_LIMIT && (
          <div className="flex items-center justify-between border-t bg-muted/20 px-3.5 py-2 text-xs">
            <span className="text-muted-foreground">
              Showing {visibleNotifications.length} of {filteredNotifications.length} notifications
            </span>
            <button
              onClick={() => setShowAllItems(!showAllItems)}
              className="font-semibold text-primary hover:underline flex items-center gap-0.5"
            >
              {showAllItems ? 'Show top 6 only' : `View all (${filteredNotifications.length})`}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
