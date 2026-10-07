import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { toast } from 'sonner@2.0.3';
import { Plus, Target, TrendingUp, DollarSign } from 'lucide-react';
import { User, Target as TargetType } from '../../types';
import { getCurrentPeriod } from '../../utils/helpers';

interface TargetManagementProps {
  salesMembers: User[];
  targets: TargetType[];
  onUpdateTarget: (targetId: string, achieved: number) => void;
  onEditTarget: (targetId: string, updates: Partial<TargetType>) => void;
  onAddTarget: (target: Omit<TargetType, 'id' | 'achieved'>) => void;
}

export function TargetManagement({ salesMembers, targets, onUpdateTarget, onEditTarget, onAddTarget }: TargetManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<TargetType | null>(null);
  const [periodFilter, setPeriodFilter] = useState<'this_month' | 'previous_month' | 'custom'>('this_month');
  const [completionFilter, setCompletionFilter] = useState<'all' | 'complete' | 'incomplete'>('incomplete');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Get current period for default value
  const currentPeriod = getCurrentPeriod('monthly');
  
  const [newTarget, setNewTarget] = useState({
    userId: '',
    type: 'monthly' as 'weekly' | 'monthly',
    target: 0,
    period: currentPeriod
  });
  const [editTarget, setEditTarget] = useState({
    userId: '',
    type: 'monthly' as 'weekly' | 'monthly',
    target: 0,
    period: ''
  });

  const handleAddTarget = () => {
    if (!newTarget.userId || !newTarget.target || !newTarget.period) {
      toast.error('Please fill in all fields');
      return;
    }
    
    // Validate period format (YYYY-MM)
    const periodRegex = /^\d{4}-\d{2}$/;
    if (!periodRegex.test(newTarget.period)) {
      toast.error('Period must be in YYYY-MM format (e.g., 2025-10)');
      return;
    }
    
    onAddTarget({
      userId: newTarget.userId,
      type: 'monthly',
      target: newTarget.target,
      period: newTarget.period
    });
    
    toast.success(`Target created for ${newTarget.period} - ₹${newTarget.target.toLocaleString()}`);
    setIsAddDialogOpen(false);
    
    // Reset with current period as default
    const resetPeriod = getCurrentPeriod('monthly');
    setNewTarget({
      userId: '',
      type: 'monthly',
      target: 0,
      period: resetPeriod
    });
  };

  const handleUpdateAchieved = (targetId: string, newAchieved: number) => {
    onUpdateTarget(targetId, newAchieved);
    toast.success('Target updated successfully');
  };

  const handleEditClick = (target: TargetType) => {
    setEditingTarget(target);
    setEditTarget({
      userId: target.userId,
      type: target.type,
      target: target.target,
      period: target.period
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingTarget || !editTarget.userId || !editTarget.target || !editTarget.period) {
      toast.error('Please fill in all fields');
      return;
    }
    
    // Validate period format (YYYY-MM)
    const periodRegex = /^\d{4}-\d{2}$/;
    if (!periodRegex.test(editTarget.period)) {
      toast.error('Period must be in YYYY-MM format (e.g., 2025-10)');
      return;
    }
    
    onEditTarget(editingTarget.id, {
      userId: editTarget.userId,
      type: 'monthly',
      target: editTarget.target,
      period: editTarget.period
    });
    
    toast.success(`Target updated for ${editTarget.period} - ₹${editTarget.target.toLocaleString()}`);
    setIsEditDialogOpen(false);
    setEditingTarget(null);
    setEditTarget({
      userId: '',
      type: 'monthly',
      target: 0,
      period: ''
    });
  };

  const getTargetStatus = (achieved: number, target: number) => {
    const percentage = (achieved / target) * 100;
    if (percentage >= 100) return { status: 'Achieved', color: 'bg-green-500' };
    if (percentage >= 80) return { status: 'On Track', color: 'bg-blue-500' };
    if (percentage >= 60) return { status: 'Behind', color: 'bg-yellow-500' };
    return { status: 'Critical', color: 'bg-red-500' };
  };

  const monthlyTargets = useMemo(() => targets.filter(t => t.type === 'monthly'), [targets]);
  const weeklyTargets = useMemo(() => targets.filter(t => t.type === 'weekly'), [targets]);
  const teamMonthlyTotal = useMemo(() => monthlyTargets.reduce((sum, t) => sum + t.target, 0), [monthlyTargets]);
  const teamMonthlyAchieved = useMemo(() => monthlyTargets.reduce((sum, t) => sum + t.achieved, 0), [monthlyTargets]);

  // Helper function to parse period string to date
  const parsePeriodToDate = (period: string): Date => {
    // Handle YYYY-MM format (monthly)
    if (period.match(/^\d{4}-\d{2}$/)) {
      return new Date(period + '-01');
    }
    // Handle YYYY-WXX format (weekly) - convert to approximate date
    if (period.match(/^\d{4}-W\d{2}$/)) {
      const [year, week] = period.split('-W');
      const date = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
      return date;
    }
    return new Date();
  };

  // Filtered targets based on period and completion status
  const filteredTargets = useMemo(() => {
    let filtered = targets;
    
    // Filter by date range
    if (periodFilter === 'this_month') {
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
      filtered = filtered.filter(t => t.period.startsWith(currentMonth));
    } else if (periodFilter === 'previous_month') {
      const now = new Date();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthStr = prevMonth.toISOString().slice(0, 7); // YYYY-MM
      filtered = filtered.filter(t => t.period.startsWith(prevMonthStr));
    } else if (periodFilter === 'custom' && customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      filtered = filtered.filter(t => {
        const targetDate = parsePeriodToDate(t.period);
        return targetDate >= startDate && targetDate <= endDate;
      });
    }
    
    // Filter by completion status
    if (completionFilter === 'complete') {
      filtered = filtered.filter(t => t.achieved >= t.target);
    } else if (completionFilter === 'incomplete') {
      filtered = filtered.filter(t => t.achieved < t.target);
    }
    
    return filtered;
  }, [targets, periodFilter, completionFilter, customStartDate, customEndDate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Target Management</h3>
          <p className="text-muted-foreground">Set and track sales targets for your team</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[rgb(0,0,0)]">
              <Plus className="h-4 w-4 mr-2" />
              Set Target
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set New Target</DialogTitle>
              <DialogDescription>Create a new sales target for a team member</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Team Member</Label>
                <Select value={newTarget.userId} onValueChange={(value) => setNewTarget({ ...newTarget, userId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Amount (₹)</Label>
                <Input
                  type="number"
                  value={newTarget.target}
                  onChange={(e) => setNewTarget({ ...newTarget, target: Number(e.target.value) })}
                  placeholder="Enter target amount"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Period (YYYY-MM)</Label>
                  {newTarget.period !== currentPeriod && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewTarget({ ...newTarget, period: currentPeriod })}
                      className="h-6 text-xs"
                    >
                      Use Current Month
                    </Button>
                  )}
                </div>
                <Input
                  value={newTarget.period}
                  onChange={(e) => setNewTarget({ ...newTarget, period: e.target.value })}
                  placeholder="YYYY-MM"
                />
                <p className="text-xs text-muted-foreground">
                  Current period: <span className="font-medium">{currentPeriod}</span>
                  {newTarget.period !== currentPeriod && newTarget.period && (
                    <span className="text-amber-600 ml-2">⚠️ Different from current month</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddTarget}>Create Target</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Team Target</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{teamMonthlyTotal.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Target for {salesMembers.length} members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Achieved</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{teamMonthlyAchieved.toLocaleString()}</div>
            <Progress 
              value={teamMonthlyTotal > 0 ? (teamMonthlyAchieved / teamMonthlyTotal) * 100 : 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achievement Rate</CardTitle>
            <span className="text-muted-foreground">₹</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMonthlyTotal > 0 ? Math.round((teamMonthlyAchieved / teamMonthlyTotal) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Team average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Targets</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Select value={periodFilter} onValueChange={(value: 'this_month' | 'previous_month' | 'custom') => setPeriodFilter(value)}>
                    <SelectTrigger className="w-[130px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="previous_month">Previous Month</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={completionFilter} onValueChange={(value: 'all' | 'complete' | 'incomplete') => setCompletionFilter(value)}>
                    <SelectTrigger className="w-[130px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                      <SelectItem value="incomplete">Incomplete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {periodFilter === 'custom' && (
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="h-8 text-sm"
                      placeholder="Start date"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="h-8 text-sm"
                      placeholder="End date"
                    />
                  </div>
                )}
              </div>
              
              <div className="text-2xl font-bold">{filteredTargets.length}</div>
              <p className="text-xs text-muted-foreground">
                {monthlyTargets.length} monthly, {weeklyTargets.length} weekly
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Targets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Targets</CardTitle>
          <CardDescription>Track progress for each team member</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Achieved</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTargets.map((target) => {
                const member = salesMembers.find(m => m.id === target.userId);
                const percentage = (target.achieved / target.target) * 100;
                const status = getTargetStatus(target.achieved, target.target);
                
                return (
                  <TableRow key={target.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>{member?.name.split(' ').map(n => n[0]).join('') || 'U'}</AvatarFallback>
                        </Avatar>
                        <span>{member?.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{target.type}</Badge>
                    </TableCell>
                    <TableCell>{target.period}</TableCell>
                    <TableCell>₹{target.target.toLocaleString()}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={target.achieved}
                        onChange={(e) => handleUpdateAchieved(target.id, Number(e.target.value))}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{Math.round(percentage)}%</div>
                        <Progress value={percentage} className="w-24 h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${status.color}`} />
                        <span className="text-sm">{status.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(target)}>Edit</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Target Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Target</DialogTitle>
            <DialogDescription>Update sales target details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Team Member</Label>
              <Select value={editTarget.userId} onValueChange={(value) => setEditTarget({ ...editTarget, userId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {salesMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Amount (₹)</Label>
              <Input
                type="number"
                value={editTarget.target}
                onChange={(e) => setEditTarget({ ...editTarget, target: Number(e.target.value) })}
                placeholder="Enter target amount"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Period (YYYY-MM)</Label>
                {editTarget.period !== currentPeriod && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditTarget({ ...editTarget, period: currentPeriod })}
                    className="h-6 text-xs"
                  >
                    Use Current Month
                  </Button>
                )}
              </div>
              <Input
                value={editTarget.period}
                onChange={(e) => setEditTarget({ ...editTarget, period: e.target.value })}
                placeholder="YYYY-MM"
              />
              <p className="text-xs text-muted-foreground">
                Current period: <span className="font-medium">{currentPeriod}</span>
                {editTarget.period !== currentPeriod && editTarget.period && (
                  <span className="text-amber-600 ml-2">⚠️ Different from current month</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}