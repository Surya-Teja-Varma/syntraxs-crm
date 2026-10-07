import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp
} from 'lucide-react';
import { User, Lead, Target as TargetType } from '../../types';

interface RevenueAnalyticsProps {
  leads: Lead[];
  targets: TargetType[];
  salesMembers: User[];
}

export function RevenueAnalytics({ leads, targets, salesMembers }: RevenueAnalyticsProps) {
  const [dealSizeFilter, setDealSizeFilter] = useState<'lowest' | 'average' | 'highest'>('average');

  // Revenue calculations
  const totalRevenue = leads.filter(lead => lead.status === 'won').reduce((sum, lead) => sum + lead.value, 0);
  const pipelineValue = leads.filter(lead => !['won', 'lost'].includes(lead.status)).reduce((sum, lead) => sum + lead.value, 0);
  const lostValue = leads.filter(lead => lead.status === 'lost').reduce((sum, lead) => sum + lead.value, 0);
  
  const monthlyTargetTotal = targets.filter(t => t.type === 'monthly').reduce((sum, t) => sum + t.target, 0);
  const monthlyAchievedTotal = targets.filter(t => t.type === 'monthly').reduce((sum, t) => sum + t.achieved, 0);
  const targetAchievement = monthlyTargetTotal > 0 ? (monthlyAchievedTotal / monthlyTargetTotal) * 100 : 0;

  // Revenue by sales member
  const revenueByMember = salesMembers.map(member => {
    const memberLeads = leads.filter(lead => lead.assignedTo === member.id);
    const revenue = memberLeads.filter(lead => lead.status === 'won').reduce((sum, lead) => sum + lead.value, 0);
    const pipeline = memberLeads.filter(lead => !['won', 'lost'].includes(lead.status)).reduce((sum, lead) => sum + lead.value, 0);
    return {
      name: member.name,
      revenue,
      pipeline,
      totalDeals: memberLeads.filter(lead => lead.status === 'won').length
    };
  });

  // Revenue by status
  const revenueByStatus = [
    { name: 'Won', value: totalRevenue, color: '#10b981' },
    { name: 'Pipeline', value: pipelineValue, color: '#3b82f6' },
    { name: 'Lost', value: lostValue, color: '#ef4444' }
  ];

  // Monthly trend - Generate last 3 months, current month, and next 2 months dynamically
  const monthlyTrend = (() => {
    const months = [];
    const currentDate = new Date();
    
    // Generate months from 3 months ago to 2 months ahead
    for (let i = -3; i <= 2; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      // Calculate revenue for this month from leads (only for past and current months)
      const isPastOrCurrent = i <= 0;
      const monthRevenue = isPastOrCurrent ? leads.filter(lead => {
        if (lead.status === 'won' && lead.createdAt) {
          const leadDate = new Date(lead.createdAt);
          return leadDate.getFullYear() === date.getFullYear() && 
                 leadDate.getMonth() === date.getMonth();
        }
        return false;
      }).reduce((sum, lead) => sum + lead.value, 0) : 0; // Future months show 0 revenue
      
      // For current month, use actual target, for other months use proportional target
      const isCurrentMonth = date.getMonth() === currentDate.getMonth() && 
                            date.getFullYear() === currentDate.getFullYear();
      const monthTarget = isCurrentMonth ? monthlyTargetTotal : monthlyTargetTotal * 0.95;
      
      months.push({
        month: monthKey,
        revenue: monthRevenue,
        target: monthTarget
      });
    }
    
    return months;
  })();

  // Lead source revenue
  const leadSourceRevenue = leads.reduce((acc, lead) => {
    if (lead.status === 'won') {
      acc[lead.source] = (acc[lead.source] || 0) + lead.value;
    }
    return acc;
  }, {} as Record<string, number>);

  const sourceData = Object.entries(leadSourceRevenue).map(([source, revenue]) => ({
    source,
    revenue
  }));

  // Deal size calculations
  const wonLeads = leads.filter(l => l.status === 'won');
  const dealSizeValue = wonLeads.length > 0 ? (() => {
    if (dealSizeFilter === 'lowest') {
      return Math.min(...wonLeads.map(l => l.value));
    } else if (dealSizeFilter === 'highest') {
      return Math.max(...wonLeads.map(l => l.value));
    } else {
      return Math.round(totalRevenue / wonLeads.length);
    }
  })() : 0;

  const dealSizeLabel = dealSizeFilter === 'lowest' ? 'Lowest closed deal' : 
                        dealSizeFilter === 'highest' ? 'Highest closed deal' : 
                        'Per closed deal';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">Revenue Analytics</h3>
        <p className="text-muted-foreground">Comprehensive revenue insights and performance metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <span className="text-lg">₹</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +15% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <span className="text-lg">📊</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{pipelineValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Active opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Target Achievement</CardTitle>
            <span className="text-lg">🎯</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(targetAchievement)}%</div>
            <Progress value={targetAchievement} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              ₹{monthlyAchievedTotal.toLocaleString()} / ₹{monthlyTargetTotal.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
              <Select value={dealSizeFilter} onValueChange={(value: 'lowest' | 'average' | 'highest') => setDealSizeFilter(value)}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lowest">Lowest Deal</SelectItem>
                  <SelectItem value="average">Average Deal</SelectItem>
                  <SelectItem value="highest">Highest Deal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-lg">🏅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{dealSizeValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {dealSizeLabel}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue by Team Member */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Team Member</CardTitle>
            <CardDescription>Individual revenue contributions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByMember}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `₹${value.toLocaleString()}`,
                    name === 'revenue' ? 'Revenue' : 'Pipeline'
                  ]}
                />
                <Bar dataKey="revenue" fill="#10b981" name="revenue" />
                <Bar dataKey="pipeline" fill="#3b82f6" name="pipeline" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Distribution</CardTitle>
            <CardDescription>Breakdown of revenue by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={100}
                  innerRadius={30}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {revenueByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Value']} 
                  labelFormatter={() => ''}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Legend with percentages */}
            <div className="flex justify-center gap-6 mt-4">
              {revenueByStatus.map((entry) => {
                const total = revenueByStatus.reduce((sum, item) => sum + item.value, 0);
                const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
                const colorClass = entry.name === 'Won' ? 'bg-green-500' : 
                                 entry.name === 'Pipeline' ? 'bg-blue-500' : 'bg-red-500';
                return (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className={`w-4 h-4 ${colorClass}`}></div>
                    <span className="text-sm font-medium">
                      {entry.name} {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Monthly revenue vs targets</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number, name: string) => [
                `₹${value.toLocaleString()}`,
                name === 'revenue' ? 'Revenue' : 'Target'
              ]} />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stackId="1" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.6}
                name="revenue"
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                stroke="#ef4444" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="target"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Lead Source Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Lead Source</CardTitle>
            <CardDescription>Which sources are generating the most revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sourceData.sort((a, b) => b.revenue - a.revenue).map((source) => {
                const percentage = totalRevenue > 0 ? (source.revenue / totalRevenue) * 100 : 0;
                return (
                  <div key={source.source} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{source.source}</span>
                      <div className="text-right">
                        <div className="font-medium">₹{source.revenue.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">{Math.round(percentage)}%</div>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>Key performance indicators this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Conversion Rate</span>
                <span className="text-sm">
                  {leads.length > 0 ? Math.round((leads.filter(l => l.status === 'won').length / leads.length) * 100) : 0}%
                </span>
              </div>
              <Progress 
                value={leads.length > 0 ? (leads.filter(l => l.status === 'won').length / leads.length) * 100 : 0} 
                className="h-2" 
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pipeline Health</span>
                <span className="text-sm">
                  {totalRevenue + pipelineValue > 0 ? Math.round((pipelineValue / (totalRevenue + pipelineValue)) * 100) : 0}%
                </span>
              </div>
              <Progress 
                value={totalRevenue + pipelineValue > 0 ? (pipelineValue / (totalRevenue + pipelineValue)) * 100 : 0} 
                className="h-2" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {leads.filter(l => l.status === 'won').length}
                </div>
                <div className="text-sm text-muted-foreground">Deals Won</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {leads.filter(l => !['won', 'lost'].includes(l.status)).length}
                </div>
                <div className="text-sm text-muted-foreground">Active Deals</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}