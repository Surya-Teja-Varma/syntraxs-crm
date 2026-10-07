import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { toast } from 'sonner';
import zoopiterLogo from '../assets/dashboard-logo.png';
import {
  Target,
  TrendingUp,
  Phone,
  Mail,
  Plus,
  Edit,
  LogOut,
  IndianRupee,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Video,
  UserCheck,
  Search,
  X,
  Calendar as CalendarIcon
} from 'lucide-react';
import { User, Lead, Target as TargetType, Activity as ActivityType } from '../types';
import { getStatusColor, formatDate } from '../utils/helpers';
import { DateTimePicker12h } from './ui/date-time-picker-12h';
import { NotificationBell } from './NotificationBell';

interface SalesDashboardProps {
  user: User;
  leads: Lead[];
  targets: TargetType[];
  activities: ActivityType[];
  onLogout: () => void;
  onUpdateLead: (leadId: string, updates: Partial<Lead>) => void;
  onAddActivity: (activity: Omit<ActivityType, 'id' | 'timestamp'>) => void;
}

export function SalesDashboard({
  user,
  leads,
  targets,
  activities,
  onLogout,
  onUpdateLead,
  onAddActivity
}: SalesDashboardProps) {
  const [newActivity, setNewActivity] = useState({
    type: 'call' as ActivityType['type'],
    description: ''
  });
  const [leadFilter, setLeadFilter] = useState<'myLeads' | 'thisMonth'>('myLeads');
  const [targetFilter, setTargetFilter] = useState<'monthly' | 'overall'>('monthly');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Lead['status']>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Lead['priority']>('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [followUpFilter, setFollowUpFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming'>('all');
  const [activityDateFilter, setActivityDateFilter] = useState<Date | undefined>(undefined);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Track when targets prop changes (critical for cross-tab sync)
  useEffect(() => {

  }, [targets, user.name]);

  // Debug: Log when leads or targets change
  useEffect(() => {



  }, [leads, targets, user.id, user.name]);

  // Filter leads based on selected filter
  const getFilteredLeads = () => {
    let filtered = leads;

    // First filter by user assignment for "My Leads"
    if (leadFilter === 'myLeads') {
      filtered = leads.filter(lead => lead.assignedTo === user.id);
    } else if (leadFilter === 'thisMonth') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = leads.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        return leadDate >= startOfMonth && lead.assignedTo === user.id;
      });
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.companyName?.toLowerCase().includes(query) ||
        lead.contactName?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.phone?.toLowerCase().includes(query) ||
        lead.industry?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(lead => lead.priority === priorityFilter);
    }

    // Apply date filter (assigned date)
    if (dateFilter) {
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        const filterDate = new Date(dateFilter);
        return (
          leadDate.getDate() === filterDate.getDate() &&
          leadDate.getMonth() === filterDate.getMonth() &&
          leadDate.getFullYear() === filterDate.getFullYear()
        );
      });
    }

    // Apply date range filter
    if (fromDate || toDate) {
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        const leadDateOnly = new Date(leadDate.getFullYear(), leadDate.getMonth(), leadDate.getDate());

        if (fromDate && toDate) {
          const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
          const to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
          return leadDateOnly >= from && leadDateOnly <= to;
        } else if (fromDate) {
          const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
          return leadDateOnly >= from;
        } else if (toDate) {
          const to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
          return leadDateOnly <= to;
        }
        return true;
      });
    }

    // Apply follow-up filter
    if (followUpFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      filtered = filtered.filter(lead => {
        if (!lead.nextFollowUp) return false;
        const followUpDate = new Date(lead.nextFollowUp);
        const followUpDay = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate());

        if (followUpFilter === 'overdue') {
          return followUpDay < today;
        } else if (followUpFilter === 'today') {
          return followUpDay.getTime() === today.getTime();
        } else if (followUpFilter === 'upcoming') {
          return followUpDay >= tomorrow;
        }
        return true;
      });
    }

    return filtered;
  };

  // Memoize filtered leads to prevent unnecessary recalculations
  const filteredLeads = useMemo(() => getFilteredLeads(), [
    leads,
    leadFilter,
    searchQuery,
    statusFilter,
    priorityFilter,
    dateFilter,
    fromDate,
    toDate,
    followUpFilter,
    user.id
  ]);

  const myLeads = useMemo(() =>
    leads.filter(lead => lead.assignedTo === user.id),
    [leads, user.id]
  );

  const thisMonthLeads = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return leads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= startOfMonth && lead.assignedTo === user.id;
    });
  }, [leads, user.id]);

  // Debug logging for leads


  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setDateFilter(undefined);
    setFromDate(undefined);
    setToDate(undefined);
    setFollowUpFilter('all');
  };

  // Pagination Logic
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [leadFilter, searchQuery, statusFilter, priorityFilter, dateFilter, fromDate, toDate, followUpFilter]);

  // Filter activities by date
  const getFilteredActivities = () => {
    if (!activityDateFilter) {
      return activities;
    }

    const filterDate = new Date(activityDateFilter);
    return activities.filter(activity => {
      const activityDate = new Date(activity.timestamp);
      return (
        activityDate.getDate() === filterDate.getDate() &&
        activityDate.getMonth() === filterDate.getMonth() &&
        activityDate.getFullYear() === filterDate.getFullYear()
      );
    });
  };

  const filteredActivities = getFilteredActivities();

  // Get current month's target (format: YYYY-MM)
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Helper function to calculate achievement for a specific period
  const calculateAchievementForPeriod = (period: string) => {
    const myAssignedLeads = leads.filter(lead => lead.assignedTo === user.id);
    const [year, month] = period.split('-').map(Number);
    const startOfPeriod = new Date(year, month - 1, 1);
    const endOfPeriod = new Date(year, month, 0, 23, 59, 59);

    const periodWonLeads = myAssignedLeads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= startOfPeriod && leadDate <= endOfPeriod && lead.status === 'won';
    });

    const achieved = periodWonLeads.reduce((sum, lead) => sum + lead.value, 0);
    const wonCount = periodWonLeads.length;

    // Debug logging


    return {
      achieved,
      wonCount
    };
  };

  // Memoize target selection to ensure it updates when targets change
  const { displayTarget } = useMemo(() => {
    const monthly = targets.find(t => t.type === 'monthly' && t.period === currentPeriod);

    // If no target for current month, get the most recent monthly target
    const fallback = !monthly ? targets.filter(t => t.type === 'monthly').sort((a, b) => b.period.localeCompare(a.period))[0] : null;
    const display = monthly || fallback;

    // Debug logging


    return { displayTarget: display };
  }, [targets, currentPeriod, user.name]);

  // Track when displayTarget changes
  useEffect(() => {
    if (displayTarget) {

    }
  }, [displayTarget?.id, displayTarget?.target, displayTarget?.period, currentPeriod, user.name]);

  const totalLeadValue = filteredLeads.reduce((sum, lead) => sum + lead.value, 0);
  const wonLeadValue = filteredLeads.filter(lead => lead.status === 'won').reduce((sum, lead) => sum + lead.value, 0);

  // Track pipeline value changes
  useEffect(() => {

  }, [totalLeadValue, wonLeadValue, user.name]);

  // FIXED: Separate monthly achievement (for Monthly Target card) - always shows current period
  const monthlyAchievement = useMemo(() => {
    if (displayTarget) {
      const periodAchievement = calculateAchievementForPeriod(displayTarget.period);

      return {
        achieved: periodAchievement.achieved,
        target: displayTarget.target,
        wonCount: periodAchievement.wonCount,
        period: displayTarget.period
      };
    }
    // Fallback to current month if no target exists
    const myAssignedLeads = leads.filter(lead => lead.assignedTo === user.id);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyWonLeads = myAssignedLeads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= startOfMonth && lead.status === 'won';
    });
    const achievedValue = monthlyWonLeads.reduce((sum, lead) => sum + lead.value, 0);

    return {
      achieved: achievedValue,
      target: 0,
      wonCount: monthlyWonLeads.length,
      period: currentPeriod
    };
  }, [leads, user.id, displayTarget?.period, displayTarget?.target, currentPeriod]);

  // Memoize achieved target calculation (for Achieved Target card) - changes based on filter
  const achievedTarget = useMemo(() => {
    const myAssignedLeads = leads.filter(lead => lead.assignedTo === user.id);

    if (targetFilter === 'monthly') {
      // Use the same calculation as monthlyAchievement

      return {
        achieved: monthlyAchievement.achieved,
        target: monthlyAchievement.target,
        wonCount: monthlyAchievement.wonCount
      };
    } else {
      // Overall - all time
      const overallWonLeads = myAssignedLeads.filter(lead => lead.status === 'won');
      const achievedValue = overallWonLeads.reduce((sum, lead) => sum + lead.value, 0);

      return {
        achieved: achievedValue,
        target: 0, // Overall doesn't have a target
        wonCount: overallWonLeads.length
      };
    }
  }, [leads, user.id, targetFilter, monthlyAchievement]);

  // Track when achievement values change
  useEffect(() => {

  }, [achievedTarget.achieved, achievedTarget.target, achievedTarget.wonCount, monthlyAchievement.achieved, monthlyAchievement.target, monthlyAchievement.wonCount, monthlyAchievement.period, targetFilter, user.name]);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };



  const handleOpenEditDialog = (lead: Lead) => {
    setEditingLead({ ...lead });
    setIsEditDialogOpen(true);
  };

  const handleSaveLeadChanges = () => {
    if (editingLead) {
      const originalLead = leads.find(l => l.id === editingLead.id);
      if (originalLead) {
        // Dynamically detect changed fields
        const updates: Partial<Lead> = {};

        // Check each field for changes
        if (editingLead.status !== originalLead.status) {
          updates.status = editingLead.status;
        }
        if (editingLead.value !== originalLead.value) {
          updates.value = editingLead.value;
        }
        if (editingLead.priority !== originalLead.priority) {
          updates.priority = editingLead.priority;
        }
        if (editingLead.nextFollowUp !== originalLead.nextFollowUp) {
          updates.nextFollowUp = editingLead.nextFollowUp;
          // Reset follow-up status when time changes
          updates.followUpStatus = 'pending';
          updates.followUpRemindedAt = '';
          updates.followUpCompletedAt = '';
          updates.followUpOverdueReason = null;
        }
        if (editingLead.lastContact !== originalLead.lastContact) {
          updates.lastContact = editingLead.lastContact;
        }
        if (editingLead.notes !== originalLead.notes) {
          updates.notes = editingLead.notes;
        }

        // Only update if there are changes
        if (Object.keys(updates).length > 0) {
          onUpdateLead(editingLead.id, updates);
          toast.success(`Lead updated successfully (${Object.keys(updates).length} field${Object.keys(updates).length > 1 ? 's' : ''} changed)`);
        } else {
          toast.info('No changes detected');
        }

        setIsEditDialogOpen(false);
        setEditingLead(null);
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setEditingLead(null);
  };

  const handleAddActivity = (leadId: string) => {
    if (!newActivity.description.trim()) {
      toast.error('Please enter activity description');
      return;
    }

    onAddActivity({
      userId: user.id,
      leadId,
      type: newActivity.type,
      description: newActivity.description
    });

    // Add to lead's call history
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      const updatedCallHistory = [
        ...lead.callHistory,
        {
          date: new Date().toISOString(),
          type: newActivity.type,
          notes: newActivity.description
        }
      ];
      onUpdateLead(leadId, {
        callHistory: updatedCallHistory,
        lastContact: new Date().toISOString()
      });
    }

    setNewActivity({ type: 'call', description: '' });
    toast.success('Activity added successfully');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <img
            src={zoopiterLogo}
            alt="Zoopiter Logo"
            className="h-12 w-auto"
          />
          <div className="ml-auto flex items-center space-x-4">
            <NotificationBell leads={leads} currentUser={user} onUpdateLead={onUpdateLead} />
            <div className="text-right">
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">Sales Representative</p>
            </div>
            <Avatar>
              <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="sm" onClick={onLogout} className="bg-black hover:bg-gray-800 rounded-full h-8 w-8 p-0">
              <LogOut className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">My Dashboard</h2>
            <p className="text-muted-foreground">Track your leads and performance</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card key={`leads-${myLeads.length}-${filteredLeads.length}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Leads</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-3">
                <Button
                  variant={leadFilter === 'myLeads' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLeadFilter('myLeads')}
                  className="text-xs"
                >
                  My Leads
                </Button>
                <Button
                  variant={leadFilter === 'thisMonth' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLeadFilter('thisMonth')}
                  className="text-xs"
                >
                  This Month
                </Button>
              </div>
              <div className="text-2xl font-bold">{filteredLeads.length}</div>
              <p className="text-xs text-muted-foreground">
                This Month: {thisMonthLeads.length} / Total: {myLeads.length}
              </p>
            </CardContent>
          </Card>

          <Card key={`achieved-${achievedTarget.achieved}-${achievedTarget.target}-${achievedTarget.wonCount}-${targetFilter}-${targets.length}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Achieved Target</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-3">
                <Button
                  variant={targetFilter === 'monthly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTargetFilter('monthly')}
                  className="text-xs"
                >
                  Monthly
                </Button>
                <Button
                  variant={targetFilter === 'overall' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTargetFilter('overall')}
                  className="text-xs"
                >
                  Overall
                </Button>
              </div>
              <div className="text-2xl font-bold" key={`achieved-value-${achievedTarget.achieved}`}>
                ₹{achievedTarget.achieved.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground" key={`achieved-text-${achievedTarget.target}-${achievedTarget.wonCount}`}>
                Target: <span key={`target-value-${achievedTarget.target}`}>₹{achievedTarget.target.toLocaleString()}</span> | Won: <span key={`won-count-${achievedTarget.wonCount}`}>{achievedTarget.wonCount}</span>
              </p>
            </CardContent>
          </Card>

          <Card key={`pipeline-${totalLeadValue}-${wonLeadValue}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalLeadValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Won: ₹{wonLeadValue.toLocaleString()} / Total: ₹{totalLeadValue.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card key={`won-${achievedTarget.wonCount}-${achievedTarget.achieved}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Won Deals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{achievedTarget.wonCount}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Value: ₹{achievedTarget.achieved.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {targetFilter === 'monthly' ? 'This month' : 'All time'}
              </p>
            </CardContent>
          </Card>

          <Card key={`monthly-${displayTarget?.id}-${displayTarget?.target}-${displayTarget?.period}-${monthlyAchievement.achieved}-${monthlyAchievement.wonCount}-${targets.length}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Target
                {displayTarget && displayTarget.period === currentPeriod && (
                  <Badge variant="default" className="ml-2 text-xs">Active</Badge>
                )}
                {displayTarget && displayTarget.period !== currentPeriod && (
                  <Badge variant="secondary" className="ml-2 text-xs">{displayTarget.period}</Badge>
                )}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {displayTarget ? (
                <>
                  <div className="text-2xl font-bold" key={`progress-${displayTarget.target}-${monthlyAchievement.achieved}`}>
                    {displayTarget.target > 0 ? Math.round((monthlyAchievement.achieved / displayTarget.target) * 100) : 0}%
                  </div>
                  <Progress
                    value={displayTarget.target > 0 ? Math.min((monthlyAchievement.achieved / displayTarget.target) * 100, 100) : 0}
                    className="mt-2"
                    key={`bar-${displayTarget.target}-${monthlyAchievement.achieved}`}
                  />
                  <p className="text-xs text-muted-foreground mt-2" key={`values-${displayTarget.target}-${monthlyAchievement.achieved}`}>
                    <span key={`achieved-${monthlyAchievement.achieved}`}>₹{monthlyAchievement.achieved.toLocaleString()}</span>
                    {' / '}
                    <span key={`target-${displayTarget.target}`}>₹{displayTarget.target.toLocaleString()}</span>
                  </p>
                  <p className="text-xs text-muted-foreground" key={`period-${displayTarget.period}-${monthlyAchievement.wonCount}`}>
                    Period: {displayTarget.period} • {monthlyAchievement.wonCount} won leads
                  </p>
                </>
              ) : targets.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    No target for current period ({currentPeriod})
                  </div>
                  <div className="text-xs text-muted-foreground">
                    You have {targets.length} target(s) for other periods. Check "Monthly Targets" tab.
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No target set</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="leads" className="space-y-6">
          <TabsList>
            <TabsTrigger value="leads">My Leads</TabsTrigger>
            <TabsTrigger value="activities">Recent Activities</TabsTrigger>
            <TabsTrigger value="targets">Monthly Targets</TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <CardTitle>My Lead Pipeline</CardTitle>
                <CardDescription>
                  Manage and update your assigned leads
                </CardDescription>
              </CardHeader>

              {/* Filter Bar */}
              <div className="px-6 pb-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                  {/* Search */}
                  <div className="lg:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="🔍 Search by company, client name, email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="new">🆕 New</SelectItem>
                        <SelectItem value="quotation_sent">✅ Quotation sent</SelectItem>
                        <SelectItem value="interested">💡 Interested</SelectItem>
                        <SelectItem value="not_able_to_contact">📵 Not Able to Contact</SelectItem>
                        <SelectItem value="not_interested">❌ Not Interested</SelectItem>
                        <SelectItem value="won">🎉 Won</SelectItem>
                        <SelectItem value="pending_payment">💰 Pending Payment</SelectItem>
                        <SelectItem value="follow_up">📞 Follow Up</SelectItem>
                        <SelectItem value="lost">😢 Lost</SelectItem>
                        <SelectItem value="dnp">🚫 DNP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Priority Filter */}
                  <div>
                    <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
                      <SelectTrigger>
                        <SelectValue>
                          {priorityFilter === 'all' ? 'All Priorities' :
                            priorityFilter === 'high' ? '🔴 High' :
                              priorityFilter === 'medium' ? '🟡 Medium' :
                                priorityFilter === 'low' ? '🟢 Low' : 'All Priorities'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="high">🔴 High</SelectItem>
                        <SelectItem value="medium">🟡 Medium</SelectItem>
                        <SelectItem value="low">🟢 Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Follow Ups Filter */}
                  <div>
                    <Select value={followUpFilter} onValueChange={(value: any) => setFollowUpFilter(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Follow Ups" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Follow Ups</SelectItem>
                        <SelectItem value="overdue">⏰ Overdue</SelectItem>
                        <SelectItem value="today">📆 Today</SelectItem>
                        <SelectItem value="upcoming">📅 Upcoming</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Date Range Filter Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {fromDate ? fromDate.toLocaleDateString() : "📅 From Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={fromDate}
                          onSelect={setFromDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {toDate ? toDate.toLocaleDateString() : "📅 To Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={toDate}
                          onSelect={setToDate}
                          disabled={(date) => fromDate ? date < fromDate : false}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Clear Filters Button */}
                {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || dateFilter || fromDate || toDate || followUpFilter !== 'all') && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Clear Filters
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Showing {filteredLeads.length} of {myLeads.length} leads
                    </span>
                  </div>
                )}
              </div>

              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[80px]">S.No</TableHead>
                        <TableHead className="min-w-[180px]">Company</TableHead>
                        <TableHead className="min-w-[180px]">Client Name</TableHead>
                        <TableHead className="min-w-[140px]">Designation</TableHead>
                        <TableHead className="min-w-[200px]">Requirement</TableHead>
                        <TableHead className="min-w-[180px]">Mobile No.</TableHead>
                        <TableHead className="min-w-[120px]">Category</TableHead>
                        <TableHead className="min-w-[120px]">Source</TableHead>
                        <TableHead className="min-w-[120px]">Audience</TableHead>
                        <TableHead className="min-w-[120px]">Date</TableHead>
                        <TableHead className="min-w-[120px]">Value</TableHead>
                        <TableHead className="min-w-[150px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">Priority</TableHead>
                        <TableHead className="min-w-[140px]">Last Contact</TableHead>
                        <TableHead className="min-w-[140px]">Next Follow-up</TableHead>
                        <TableHead className="min-w-[140px]">Call Log</TableHead>
                        <TableHead className="min-w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLeads.map((lead, index) => (
                        <TableRow key={lead.id}>
                          <TableCell className="min-w-[80px]">
                            <div className="font-medium text-center">
                              {(currentPage - 1) * itemsPerPage + index + 1}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[180px]">
                            <div>
                              <div className="font-medium">{lead.companyName}</div>
                              <div className="text-sm text-muted-foreground">{lead.industry || ''}</div>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[180px]">
                            <div>
                              <div className="font-medium">{lead.contactName}</div>
                              <div className="text-sm text-muted-foreground">{lead.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <div className="text-sm">
                              {lead.designation || ''}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[200px]">
                            <div className="text-sm max-w-[200px] truncate" title={lead.requirement || ''}>
                              {lead.requirement || ''}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[180px]">
                            <div className="text-sm whitespace-nowrap">
                              {lead.phone || ''}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <div className="text-sm">
                              {lead.category || ''}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <div className="text-sm capitalize">
                              {lead.source || ''}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <div className="text-sm">
                              {lead.audience || ''}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <div className="text-sm whitespace-nowrap">
                              {new Date(lead.createdAt).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <div className="flex items-center whitespace-nowrap">
                              <IndianRupee className="h-3 w-3 mr-1" />
                              {lead.value.toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[150px]">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(lead.status)}`} />
                              <Badge variant="secondary" className="capitalize whitespace-nowrap">
                                {lead.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <div className="flex items-center space-x-2">
                              {getPriorityIcon(lead.priority)}
                              <span className="capitalize">{lead.priority}</span>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <div className="text-sm whitespace-nowrap">
                              {formatDate(lead.lastContact)}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <div className="text-sm whitespace-nowrap">
                              {formatDate(lead.nextFollowUp)}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="whitespace-nowrap">
                                  📞 View ({lead.callHistory.length})
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Call Log - {lead.companyName}</DialogTitle>
                                  <DialogDescription>
                                    Complete activity history for this lead
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3">
                                  {lead.callHistory.length > 0 ? (
                                    lead.callHistory.map((call, index) => (
                                      <div key={index} className="p-4 border rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center space-x-2">
                                            {call.type === 'call' && <Phone className="h-4 w-4" />}
                                            {call.type === 'email' && <Mail className="h-4 w-4" />}
                                            {call.type === 'whatsapp' && <MessageSquare className="h-4 w-4" />}
                                            {call.type === 'meeting' && <Video className="h-4 w-4" />}
                                            <span className="capitalize font-medium">{call.type}</span>
                                          </div>
                                          <span className="text-sm text-muted-foreground">
                                            {formatDate(call.date)}
                                          </span>
                                        </div>
                                        <p className="text-sm">{call.notes}</p>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                      No activity history for this lead yet
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                          <TableCell className="min-w-[100px]">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditDialog(lead)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-2 py-4 border-t mt-4">
                  <div className="flex-1 text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="text-sm font-medium">
                      Page {currentPage} of {totalPages || 1}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      Last
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1.5">
                    <CardTitle>Recent Activities</CardTitle>
                    <CardDescription>
                      Your recent lead interactions and updates
                    </CardDescription>
                  </div>

                  {/* Activity Date Filter */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium">📅 Filter by Date:</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-normal min-w-[180px]">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {activityDateFilter ? (
                            `${activityDateFilter.getDate().toString().padStart(2, '0')}-${(activityDateFilter.getMonth() + 1).toString().padStart(2, '0')}-${activityDateFilter.getFullYear()}`
                          ) : (
                            "dd-mm-yyyy"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={activityDateFilter}
                          onSelect={setActivityDateFilter}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    {activityDateFilter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActivityDateFilter(undefined)}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Clear
                      </Button>
                    )}

                    <span className="text-sm text-muted-foreground">
                      📊 {filteredActivities.length} total
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {filteredActivities.slice(0, 10).map((activity) => {
                    const lead = leads.find(l => l.id === activity.leadId);
                    return (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <div className="mt-1">
                          {activity.type === 'call' && <Phone className="h-4 w-4" />}
                          {activity.type === 'email' && <Mail className="h-4 w-4" />}
                          {activity.type === 'whatsapp' && <MessageSquare className="h-4 w-4" />}
                          {activity.type === 'meeting' && <Video className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">
                              {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} - {lead?.companyName}
                            </h4>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(activity.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                        </div>
                      </div>
                    );
                  })}
                  {filteredActivities.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      {activityDateFilter
                        ? "No activities found for the selected date. Try a different date or clear the filter."
                        : "No activities yet. Start by updating your leads!"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="targets">
            <Card>
              <CardHeader>
                <CardTitle>My Targets</CardTitle>
                <CardDescription>
                  Track your monthly target progress across all periods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Current Target Progress */}
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">Current Target Progress</div>
                    {displayTarget ? (
                      <>
                        <div className="text-4xl font-bold">
                          {Math.round((achievedTarget.achieved / displayTarget.target) * 100)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ₹{achievedTarget.achieved.toLocaleString()} / ₹{displayTarget.target.toLocaleString()}
                        </div>
                        <Progress
                          value={Math.min((achievedTarget.achieved / displayTarget.target) * 100, 100)}
                          className="h-2"
                        />
                        <div className="pt-4 space-y-2">
                          <div className="text-sm text-muted-foreground">Period: {displayTarget.period}</div>
                          <div className="text-2xl font-bold">
                            {achievedTarget.wonCount} Won
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Deals closed
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-4xl font-bold">0%</div>
                        <div className="text-sm text-muted-foreground">No target set</div>
                        <Progress value={0} className="h-2" />
                        <div className="pt-4 space-y-2">
                          <div className="text-sm text-muted-foreground">Pipeline Value</div>
                          <div className="text-2xl font-bold">
                            ₹{totalLeadValue.toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Open/in-progress leads
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pipeline Overview */}
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">Pipeline Overview</div>
                    <div className="space-y-4">
                      <div>
                        <div className="text-4xl font-bold">
                          ₹{totalLeadValue.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total pipeline value
                        </div>
                      </div>
                      <div className="pt-4 space-y-3 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Won</span>
                          <span className="font-medium">₹{wonLeadValue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">In Progress</span>
                          <span className="font-medium">₹{(totalLeadValue - wonLeadValue).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total Leads</span>
                          <span className="font-medium">{filteredLeads.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* All Targets List */}
                <div className="mt-8">
                  <h4 className="font-medium mb-4">All My Targets</h4>
                  {targets.length > 0 ? (
                    <div className="space-y-3">
                      {targets.sort((a, b) => b.period.localeCompare(a.period)).map((target) => {
                        // Calculate real-time achievement for this target's period
                        const periodAchievement = calculateAchievementForPeriod(target.period);
                        const percentage = target.target > 0 ? (periodAchievement.achieved / target.target) * 100 : 0;
                        return (
                          <div key={target.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <span className="font-medium">Period: {target.period}</span>
                                {target.period === currentPeriod && (
                                  <Badge className="ml-2" variant="default">Current</Badge>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground capitalize">{target.type}</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Target: ₹{target.target.toLocaleString()}</span>
                                <span>Achieved: ₹{periodAchievement.achieved.toLocaleString()}</span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                              <div className="text-sm text-muted-foreground text-right">
                                {Math.round(percentage)}% Complete ({periodAchievement.wonCount} won leads)
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                      No targets assigned yet. Contact your admin to set targets.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Lead Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Lead: {editingLead?.companyName}</DialogTitle>
            <DialogDescription>
              Update lead information and add activities
            </DialogDescription>
          </DialogHeader>
          {editingLead && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Lead Information</h4>
                  <div className="space-y-3">
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={editingLead.status}
                        onValueChange={(value: Lead['status']) =>
                          setEditingLead({ ...editingLead, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="quotation_sent">Quotation sent</SelectItem>
                          <SelectItem value="interested">Interested</SelectItem>
                          <SelectItem value="not_able_to_contact">Not able to contact</SelectItem>
                          <SelectItem value="not_interested">Not Interested</SelectItem>
                          <SelectItem value="won">Won</SelectItem>
                          <SelectItem value="pending_payment">Pending Payment</SelectItem>
                          <SelectItem value="follow_up">Follow Up</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                          <SelectItem value="dnp">DNP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Expected Revenue (₹)</Label>
                      <Input
                        type="number"
                        value={editingLead.value}
                        onChange={(e) =>
                          setEditingLead({ ...editingLead, value: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select
                        value={editingLead.priority}
                        onValueChange={(value: Lead['priority']) =>
                          setEditingLead({ ...editingLead, priority: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Next Follow-up</Label>
                      <DateTimePicker12h
                        value={editingLead.nextFollowUp ? new Date(editingLead.nextFollowUp) : undefined}
                        onChange={(date) =>
                          setEditingLead({ ...editingLead, nextFollowUp: date ? date.toISOString() : undefined })
                        }
                      />
                    </div>
                    <div>
                      <Label>Last Contact</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <DateTimePicker12h
                            value={editingLead.lastContact ? new Date(editingLead.lastContact) : undefined}
                            onChange={(date) =>
                              setEditingLead({ ...editingLead, lastContact: date ? date.toISOString() : undefined })
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const now = new Date();
                            setEditingLead({ ...editingLead, lastContact: now.toISOString() });
                            toast.success('Last Contact set to current date and time');
                          }}
                          className="whitespace-nowrap"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Add Activity</h4>
                  <div className="space-y-3">
                    <div>
                      <Label>Activity Type</Label>
                      <Select
                        value={newActivity.type}
                        onValueChange={(value: ActivityType['type']) =>
                          setNewActivity({ ...newActivity, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-2" />
                              Phone Call
                            </div>
                          </SelectItem>
                          <SelectItem value="email">
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-2" />
                              Email
                            </div>
                          </SelectItem>
                          <SelectItem value="whatsapp">
                            <div className="flex items-center">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              WhatsApp
                            </div>
                          </SelectItem>
                          <SelectItem value="meeting">
                            <div className="flex items-center">
                              <Video className="h-4 w-4 mr-2" />
                              Meeting
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Activity Notes</Label>
                      <Textarea
                        value={newActivity.description}
                        onChange={(e) =>
                          setNewActivity({ ...newActivity, description: e.target.value })
                        }
                        placeholder="Enter activity details..."
                        rows={4}
                      />
                    </div>
                    <Button
                      onClick={() => handleAddActivity(editingLead.id)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Activity
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Lead Notes</Label>
                <Textarea
                  value={editingLead.notes || ''}
                  onChange={(e) =>
                    setEditingLead({ ...editingLead, notes: e.target.value })
                  }
                  placeholder="Enter lead notes..."
                  rows={3}
                />
              </div>

              {editingLead.callHistory && editingLead.callHistory.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Call History</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {editingLead.callHistory.map((call, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {call.type === 'call' && <Phone className="h-4 w-4" />}
                            {call.type === 'email' && <Mail className="h-4 w-4" />}
                            {call.type === 'whatsapp' && <MessageSquare className="h-4 w-4" />}
                            {call.type === 'meeting' && <Video className="h-4 w-4" />}
                            <span className="capitalize font-medium">{call.type}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(call.date)}
                          </span>
                        </div>
                        <p className="text-sm">{call.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSaveLeadChanges}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div >
  );
}