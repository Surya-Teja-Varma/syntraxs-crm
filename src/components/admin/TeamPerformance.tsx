import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { 
  Users, 
  TrendingUp, 
  Phone, 
  Mail, 
  Calendar,
  Target,
  DollarSign,
  Activity,
  Award
} from 'lucide-react';
import { User, Lead, Target as TargetType, Activity as ActivityType } from '../../types';

interface TeamPerformanceProps {
  salesMembers: User[];
  leads: Lead[];
  targets: TargetType[];
  activities: ActivityType[];
}

export function TeamPerformance({ salesMembers, leads, targets, activities }: TeamPerformanceProps) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date());
  const [activityDateFilter, setActivityDateFilter] = useState('');

  // Filter data by selected month
  const filterByMonth = (dateString: string) => {
    const date = new Date(dateString);
    return date.getFullYear() === selectedMonth.getFullYear() && 
           date.getMonth() === selectedMonth.getMonth();
  };

  const filteredLeads = leads.filter(lead => filterByMonth(lead.createdAt));
  const filteredActivities = activities.filter(activity => filterByMonth(activity.timestamp));

  const getMemberStats = (memberId: string) => {
    const memberLeads = filteredLeads.filter(lead => lead.assignedTo === memberId);
    const memberTargets = targets.filter(target => target.userId === memberId);
    const memberActivities = filteredActivities.filter(activity => activity.userId === memberId);
    
    const totalValue = memberLeads.reduce((sum, lead) => sum + lead.value, 0);
    const wonValue = memberLeads.filter(lead => lead.status === 'won').reduce((sum, lead) => sum + lead.value, 0);
    const conversionRate = memberLeads.length > 0 ? (memberLeads.filter(lead => lead.status === 'won').length / memberLeads.length) * 100 : 0;
    
    const monthlyTarget = memberTargets.find(t => t.type === 'monthly');
    const weeklyTarget = memberTargets.find(t => t.type === 'weekly');
    
    return {
      totalLeads: memberLeads.length,
      totalValue,
      wonValue,
      conversionRate,
      monthlyTarget,
      weeklyTarget,
      totalActivities: memberActivities.length,
      leadsThisWeek: memberLeads.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return leadDate > weekAgo;
      }).length
    };
  };

  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 100) return { level: 'Excellent', color: 'bg-green-500' };
    if (percentage >= 80) return { level: 'Good', color: 'bg-blue-500' };
    if (percentage >= 60) return { level: 'Average', color: 'bg-yellow-500' };
    return { level: 'Needs Improvement', color: 'bg-red-500' };
  };

  const teamStats = {
    totalLeads: filteredLeads.length,
    totalRevenue: filteredLeads.filter(lead => lead.status === 'won').reduce((sum, lead) => sum + lead.value, 0),
    averageConversion: salesMembers.length > 0 ? 
      salesMembers.reduce((sum, member) => sum + getMemberStats(member.id).conversionRate, 0) / salesMembers.length : 0,
    totalActivities: filteredActivities.length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Team Performance</h3>
          <p className="text-muted-foreground">Monitor and analyze your sales team's performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium whitespace-nowrap">
            Select Month:
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[220px] justify-start text-left font-normal border-2"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {selectedMonth ? (
                  selectedMonth.toLocaleDateString('en-GB', {
                    month: 'long',
                    year: 'numeric'
                  })
                ) : (
                  <span className="text-muted-foreground">Pick a month</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedMonth}
                onSelect={(date) => date && setSelectedMonth(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Team Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Team Leads</CardTitle>
            <span className="text-lg">👥</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              Across {salesMembers.length} team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Revenue</CardTitle>
            <span className="text-lg">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{teamStats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From closed deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Conversion</CardTitle>
            <span className="text-lg">📈</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(teamStats.averageConversion)}%</div>
            <p className="text-xs text-muted-foreground">
              Team average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Activities</CardTitle>
            <span className="text-lg">📋</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.totalActivities}</div>
            <p className="text-xs text-muted-foreground">
              Total activities logged
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Individual Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Performance</CardTitle>
          <CardDescription>Detailed performance metrics for each team member</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sales Member</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Pipeline Value</TableHead>
                <TableHead>Won Deals</TableHead>
                <TableHead>Conversion Rate</TableHead>
                <TableHead>Monthly Target</TableHead>
                <TableHead>Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesMembers.map((member) => {
                const stats = getMemberStats(member.id);
                const monthlyPercentage = stats.monthlyTarget ? 
                  (stats.monthlyTarget.achieved / stats.monthlyTarget.target) * 100 : 0;
                const performance = getPerformanceLevel(monthlyPercentage);
                
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{stats.totalLeads}</div>
                        <div className="text-sm text-muted-foreground">
                          {stats.leadsThisWeek} this week
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">₹{stats.totalValue.toLocaleString()}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">₹{stats.wonValue.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {leads.filter(l => l.assignedTo === member.id && l.status === 'won').length} deals
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium">{Math.round(stats.conversionRate)}%</div>
                        <Progress value={stats.conversionRate} className="w-16 h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      {stats.monthlyTarget ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            ₹{stats.monthlyTarget.achieved.toLocaleString()} / ₹{stats.monthlyTarget.target.toLocaleString()}
                          </div>
                          <Progress value={monthlyPercentage} className="w-full h-2" />
                          <div className="text-xs text-muted-foreground">
                            {Math.round(monthlyPercentage)}% achieved
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline">No target set</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${performance.color}`} />
                        <span className="text-sm">{performance.level}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Activities by Team */}
      <Card>

        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Recent Team Activities</CardTitle>
              <CardDescription>Latest activities from your sales team</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm whitespace-nowrap">Filter by Date:</span>
              <Input
                type="date"
                placeholder="dd-mm-yyyy"
                value={activityDateFilter}
                onChange={(e) => setActivityDateFilter(e.target.value)}
                className="w-[160px]"
              />
              <span className="text-sm whitespace-nowrap">{filteredActivities.length} total</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredActivities
              .filter(activity => !activityDateFilter || new Date(activity.timestamp).toISOString().split('T')[0] === activityDateFilter)
              .slice(0, 8)
              .map((activity) => {
              const member = salesMembers.find(m => m.id === activity.userId);
              const lead = leads.find(l => l.id === activity.leadId);
              
              return (
                <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <Avatar className="mt-1">
                    <AvatarFallback>{member?.name.split(' ').map(n => n[0]).join('') || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {activity.type === 'call' && <Phone className="h-4 w-4" />}
                        {activity.type === 'email' && <Mail className="h-4 w-4" />}
                        {activity.type === 'meeting' && <Calendar className="h-4 w-4" />}
                        <span className="font-medium">{member?.name}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground capitalize">{activity.type}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm mt-1">
                      <span className="font-medium">{lead?.companyName}</span> - {activity.description}
                    </p>
                  </div>
                </div>
              );
            })}
            {filteredActivities.filter(activity => !activityDateFilter || new Date(activity.timestamp).toISOString().split('T')[0] === activityDateFilter).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {activityDateFilter ? 'No activities found for selected date' : 'No team activities yet'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}