import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Progress } from './ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  LogOut,
  Download,
  UserPlus
} from 'lucide-react';
import { User, Lead, Target as TargetType, Activity as ActivityType } from '../types';
import { getStatusColor } from '../utils/helpers';
import { LeadManagement } from './admin/LeadManagement';
import { TeamPerformance } from './admin/TeamPerformance';
import { RevenueAnalytics } from './admin/RevenueAnalytics';
import { Reports } from './admin/Reports';
import { TargetManagement } from './admin/TargetManagement';
import logoImage from '../assets/dashboard-logo.png';
import { toast } from 'sonner';
import { NotificationBell } from './NotificationBell';

interface AdminDashboardProps {
  user: User;
  users: User[];
  leads: Lead[];
  targets: TargetType[];
  activities: ActivityType[];
  onLogout: () => void;
  onUpdateLead: (leadId: string, updates: Partial<Lead>) => void;
  onAddLead: (lead: Omit<Lead, 'id'>) => void;
  onDeleteLead: (leadId: string) => void;
  onUpdateTarget: (targetId: string, achieved: number) => void;
  onEditTarget: (targetId: string, updates: Partial<TargetType>) => void;
  onAddTarget: (target: Omit<TargetType, 'id' | 'achieved'>) => void;
  onAddUser: (user: Omit<User, 'id'>) => void;
}

export function AdminDashboard({
  user,
  users,
  leads,
  targets,
  activities,
  onLogout,
  onUpdateLead,
  onAddLead,
  onDeleteLead,
  onUpdateTarget,
  onEditTarget,
  onAddTarget,
  onAddUser
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'sales' as 'admin' | 'sales'
  });

  // Memoize expensive calculations
  const salesMembers = useMemo(() => users.filter(u => u.role === 'sales'), [users]);

  const totalRevenue = useMemo(() =>
    leads
      .filter(lead => lead.status === 'won')
      .reduce((sum, lead) => sum + lead.value, 0),
    [leads]
  );

  const monthlyTargets = useMemo(() => targets.filter(t => t.type === 'monthly'), [targets]);

  const { totalMonthlyTarget, totalMonthlyAchieved } = useMemo(() => ({
    totalMonthlyTarget: monthlyTargets.reduce((sum, t) => sum + t.target, 0),
    totalMonthlyAchieved: monthlyTargets.reduce((sum, t) => sum + t.achieved, 0)
  }), [monthlyTargets]);

  const leadsByStatus = useMemo(() =>
    leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    [leads]
  );

  // Export functions
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Handle values that contain commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportUsersAndLeads = () => {
    // Create unified data structure with Type column
    const usersData = users.map(u => ({
      Type: 'USER',
      Name: u.name,
      Email: u.email,
      Role: u.role,
      'Mobile No.': u.phone || 'N/A',
      'Company Name': '',
      'Client Name': '',
      Designation: '',
      Requirement: '',
      Category: '',
      Source: '',
      Audience: '',
      'Expected Value (₹)': '',
      Status: '',
      Priority: '',
      'Assigned To': '',
      'Created At': '',
      'Next Follow-up': '',
      Notes: ''
    }));

    const leadsData = leads.map(l => ({
      Type: 'LEAD',
      Name: '',
      Email: l.email,
      Role: '',
      'Mobile No.': l.phone,
      'Company Name': l.companyName,
      'Client Name': l.contactName,
      Designation: l.designation || 'N/A',
      Requirement: l.requirement || 'N/A',
      Category: l.category || 'N/A',
      Source: l.source,
      Audience: l.audience || 'N/A',
      'Expected Value (₹)': l.value,
      Status: l.status,
      Priority: l.priority,
      'Assigned To': l.assignedToName || users.find(u => u.id === l.assignedTo)?.name || 'Unassigned',
      'Created At': new Date(l.createdAt).toLocaleDateString(),
      'Next Follow-up': l.nextFollowUp ? new Date(l.nextFollowUp).toLocaleDateString() : 'N/A',
      Notes: l.notes || 'N/A'
    }));

    // Combine both arrays into one
    const combinedData = [...usersData, ...leadsData];

    exportToCSV(combinedData, `zoopiter-users-leads-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exporting ${users.length} users + ${leads.length} leads in one file...`);
  };

  const handleExportUsers = () => {
    const usersData = users.map(u => ({
      Name: u.name,
      Email: u.email,
      Role: u.role,
      'Mobile No.': u.phone || 'N/A'
    }));
    exportToCSV(usersData, `zoopiter-users-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Exporting Users data...');
  };

  const handleExportLeads = () => {
    const leadsData = leads.map(l => ({
      'Company Name': l.companyName,
      'Client Name': l.contactName,
      Designation: l.designation || 'N/A',
      Requirement: l.requirement || 'N/A',
      Email: l.email,
      'Mobile No.': l.phone,
      Category: l.category || 'N/A',
      Source: l.source,
      Audience: l.audience || 'N/A',
      'Expected Value (₹)': l.value,
      Status: l.status,
      Priority: l.priority,
      'Assigned To': l.assignedToName || users.find(u => u.id === l.assignedTo)?.name || 'Unassigned',
      'Created At': new Date(l.createdAt).toLocaleDateString(),
      'Next Follow-up': l.nextFollowUp ? new Date(l.nextFollowUp).toLocaleDateString() : 'N/A',
      Notes: l.notes || 'N/A'
    }));
    exportToCSV(leadsData, `zoopiter-leads-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Exporting Leads data...');
  };

  const handleCreateAccount = async () => {
    if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validate password length (Firebase requires at least 6 characters)
    if (newUser.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    // First check if the email exists in our local state
    if (users.some(u => u.email === newUser.email)) {
      toast.error('Email already exists in the system');
      return;
    }

    try {
      // Show loading toast
      toast.loading('Creating new user account...');

      await onAddUser({
        name: `${newUser.firstName} ${newUser.lastName}`,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        phone: ''
      });

      toast.success('Account created successfully! User can now login with the provided credentials.');
      setIsCreateAccountOpen(false);
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'sales'
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(`Failed to create account: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center space-x-3">
            <img src={logoImage} alt="Zoopiter" className="h-10" />
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <NotificationBell leads={leads} currentUser={user} onUpdateLead={onUpdateLead} />
            <Button
              variant="default"
              size="default"
              onClick={() => setIsCreateAccountOpen(true)}
              className="flex items-center gap-2 rounded-full"
            >
              <UserPlus className="h-5 w-5" />
              {/* <span>Add New User</span> */}
            </Button>
            <div className="text-right">
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">Sales Manager</p>
            </div>
            <Avatar>
              <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="sm" onClick={onLogout} className="bg-black hover:bg-gray-800 rounded-full h-9 w-9 p-0">
              <LogOut className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <div className="flex space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleExportUsersAndLeads}>
                  Users + Leads
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportUsers}>
                  Users Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportLeads}>
                  Leads Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full justify-between min-w-0">
            <TabsTrigger value="overview" className="flex-1 min-w-0 text-base sm:text-base font-medium" style={{ color: '#000000' }}>Overview</TabsTrigger>
            <TabsTrigger value="leads" className="flex-1 min-w-0 text-base sm:text-base font-medium" style={{ color: '#000000' }}>Lead Management</TabsTrigger>
            <TabsTrigger value="team" className="flex-1 min-w-0 text-base sm:text-base font-medium" style={{ color: '#000000' }}>Team Performance</TabsTrigger>
            <TabsTrigger value="revenue" className="flex-1 min-w-0 text-base sm:text-base font-medium" style={{ color: '#000000' }}>Revenue Analytics</TabsTrigger>
            <TabsTrigger value="targets" className="flex-1 min-w-0 text-base sm:text-base font-medium" style={{ color: '#000000' }}>Targets</TabsTrigger>
            <TabsTrigger value="reports" className="flex-1 min-w-0 text-base sm:text-base font-medium" style={{ color: '#000000' }}>Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                  <span className="text-lg">📋</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{leads.length}</div>
                  <p className="text-xs text-muted-foreground">+12% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Achieved Target</CardTitle>
                  <span className="text-lg">💰</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">+20% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue In Percentage %</CardTitle>
                  <span className="text-lg">🎯</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round((totalMonthlyAchieved / totalMonthlyTarget) * 100)}%
                  </div>
                  <Progress
                    value={(totalMonthlyAchieved / totalMonthlyTarget) * 100}
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Sales Members</CardTitle>
                  <span className="text-lg">👥</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{salesMembers.length}</div>
                  <p className="text-xs text-muted-foreground">All members active</p>
                </CardContent>
              </Card>
            </div>

            {/* Lead Status Overview */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Lead Status Distribution</CardTitle>
                  <CardDescription>Current status of all leads in the pipeline</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(leadsByStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                        <span className="capitalize">{status.replace('_', ' ')}</span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Team Performance Summary</CardTitle>
                  <CardDescription>Monthly target achievement by team members</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {salesMembers.map(member => {
                    const memberTargets = targets.filter(t => t.userId === member.id && t.type === 'monthly');
                    const target = memberTargets[0];
                    if (!target) return null;

                    const percentage = Math.round((target.achieved / target.target) * 100);

                    return (
                      <div key={member.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{member.name}</span>
                          <span className="text-sm text-muted-foreground">
                            ₹{target.achieved.toLocaleString()} / ₹{target.target.toLocaleString()}
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Lead Activities</CardTitle>
                <CardDescription>Latest updates from your sales team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leads.slice(0, 5).map(lead => (
                    <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>{lead.contactName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{lead.companyName}</p>
                          <p className="text-sm text-muted-foreground">
                            Client: {lead.contactName} • Assigned to: {lead.assignedToName || 'Unassigned'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={lead.status === 'won' ? 'default' : 'secondary'}>
                          {lead.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          ₹{lead.value.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads">
            <LeadManagement
              leads={leads}
              salesMembers={salesMembers}
              currentUser={user}
              onUpdateLead={onUpdateLead}
              onAddLead={onAddLead}
              onDeleteLead={onDeleteLead}
            />
          </TabsContent>

          <TabsContent value="team">
            <TeamPerformance
              salesMembers={salesMembers}
              leads={leads}
              targets={targets}
              activities={activities}
            />
          </TabsContent>

          <TabsContent value="revenue">
            <RevenueAnalytics
              leads={leads}
              targets={targets}
              salesMembers={salesMembers}
            />
          </TabsContent>

          <TabsContent value="targets">
            <TargetManagement
              salesMembers={salesMembers}
              targets={targets}
              onUpdateTarget={onUpdateTarget}
              onEditTarget={onEditTarget}
              onAddTarget={onAddTarget}
            />
          </TabsContent>

          <TabsContent value="reports">
            <Reports
              leads={leads}
              salesMembers={salesMembers}
              targets={targets}
              activities={activities}
            />
          </TabsContent>

        </Tabs>
      </div>

      {/* Create Account Dialog */}
      <Dialog open={isCreateAccountOpen} onOpenChange={setIsCreateAccountOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center">Create Account</DialogTitle>
          </DialogHeader>
          <p className="text-center text-muted-foreground text-sm">
            Sign up for your CRM account
          </p>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="First name"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Last name"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password (min 6 characters)"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: 'admin' | 'sales') => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleCreateAccount}
              className="w-full bg-black hover:bg-gray-800 text-white"
            >
              Create Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}