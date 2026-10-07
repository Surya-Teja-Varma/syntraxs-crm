import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  Download,
  Users,
  TrendingUp,
  Target,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Activity as ActivityIcon,
  X
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { User, Lead, Target as TargetType, Activity as ActivityType } from '../../types';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface ReportsProps {
  leads: Lead[];
  salesMembers: User[];
  targets: TargetType[];
  activities: ActivityType[];
}

export function Reports({ leads, salesMembers, targets, activities }: ReportsProps) {
  const [reportType, setReportType] = useState('lead');
  const [dateRange, setDateRange] = useState('month');
  const [selectedMember, setSelectedMember] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Status-specific color mapping for consistent colors
  const getStatusSpecificColor = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
    const statusColors: Record<string, string> = {
      // Primary status colors
      'na': '#ef4444',                    // red-500 - Default/Unknown
      'new': '#06b6d4',                   // cyan-500 - New leads
      'interested': '#3b82f6',            // blue-500 - Interested
      'quotation_sent': '#22c55e',        // green-500 - Quotation sent
      'follow_up': '#f97316',             // orange-500 - Follow up
      'follow-up': '#f97316',             // orange-500 - Follow up (alternative)
      'won': '#10b981',                   // emerald-500 - Won/Success
      'pending_payment': '#eab308',       // yellow-500 - Pending payment
      'not_interested': '#dc2626',        // red-600 - Not interested
      'not_able_to_contact': '#ec4899',   // pink-500 - Contact issues

      // Additional statuses
      'lost': '#991b1b',                  // red-800 - Lost
      'qualified': '#14b8a6',             // teal-500 - Qualified
      'proposal': '#6366f1',              // indigo-500 - Proposal sent
      'negotiation': '#d946ef',           // fuchsia-500 - Negotiation
      'cold': '#64748b',                  // slate-600 - Cold leads
      'hot': '#f59e0b',                   // amber-500 - Hot leads
      'warm': '#84cc16',                  // lime-500 - Warm leads
      'rejected': '#7f1d1d',              // red-900 - Rejected
      'on_hold': '#8b5cf6',               // violet-500 - On hold
      'callback': '#06b6d4',              // cyan-500 - Callback scheduled
    };

    return statusColors[normalizedStatus] || '#94a3b8'; // Default to slate-400
  };

  const getStatusSpecificTailwindClass = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
    const statusClasses: Record<string, string> = {
      // Primary status classes
      'na': 'bg-red-500',
      'new': 'bg-cyan-500',
      'interested': 'bg-blue-500',
      'quotation_sent': 'bg-green-500',
      'follow_up': 'bg-orange-500',
      'follow-up': 'bg-orange-500',
      'won': 'bg-emerald-500',
      'pending_payment': 'bg-yellow-500',
      'not_interested': 'bg-red-600',
      'not_able_to_contact': 'bg-pink-500',

      // Additional statuses
      'lost': 'bg-red-800',
      'qualified': 'bg-teal-500',
      'proposal': 'bg-indigo-500',
      'negotiation': 'bg-fuchsia-500',
      'cold': 'bg-slate-600',
      'hot': 'bg-amber-500',
      'warm': 'bg-lime-500',
      'rejected': 'bg-red-900',
      'on_hold': 'bg-violet-500',
      'callback': 'bg-cyan-500',
    };

    return statusClasses[normalizedStatus] || 'bg-slate-400'; // Default
  };

  const getFilteredData = () => {
    let filteredLeads = leads;
    let filteredActivities = activities;

    // Filter by date range
    const now = new Date();
    let startDate = new Date();

    switch (dateRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    filteredLeads = leads.filter(lead => new Date(lead.createdAt) >= startDate);
    filteredActivities = activities.filter(activity => new Date(activity.timestamp) >= startDate);

    // Filter by team member
    if (selectedMember !== 'all') {
      filteredLeads = filteredLeads.filter(lead => lead.assignedTo === selectedMember);
      filteredActivities = filteredActivities.filter(activity => activity.userId === selectedMember);
    }

    return { filteredLeads, filteredActivities };
  };

  const generateLeadReport = () => {
    const { filteredLeads } = getFilteredData();

    const statusBreakdown = filteredLeads.reduce((acc, lead) => {
      const normalizedStatus = lead.status.toLowerCase();
      acc[normalizedStatus] = (acc[normalizedStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sourceBreakdown = filteredLeads.reduce((acc, lead) => {
      acc[lead.source] = (acc[lead.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalValue = filteredLeads.reduce((sum, lead) => sum + lead.value, 0);
    const wonValue = filteredLeads.filter(lead => lead.status === 'won').reduce((sum, lead) => sum + lead.value, 0);
    const conversionRate = filteredLeads.length > 0 ? (filteredLeads.filter(lead => lead.status === 'won').length / filteredLeads.length) * 100 : 0;

    return {
      totalLeads: filteredLeads.length,
      statusBreakdown,
      sourceBreakdown,
      totalValue,
      wonValue,
      conversionRate
    };
  };

  const generateEmployeeReport = () => {
    const { filteredLeads, filteredActivities } = getFilteredData();

    return salesMembers.map(member => {
      const memberLeads = filteredLeads.filter(lead => lead.assignedTo === member.id);
      const memberActivities = filteredActivities.filter(activity => activity.userId === member.id);
      const memberTargets = targets.filter(target => target.userId === member.id);

      const totalValue = memberLeads.reduce((sum, lead) => sum + lead.value, 0);
      const wonValue = memberLeads.filter(lead => lead.status === 'won').reduce((sum, lead) => sum + lead.value, 0);
      const conversionRate = memberLeads.length > 0 ? (memberLeads.filter(lead => lead.status === 'won').length / memberLeads.length) * 100 : 0;

      const monthlyTarget = memberTargets.find(t => t.type === 'monthly');
      const targetAchievement = monthlyTarget ? (monthlyTarget.achieved / monthlyTarget.target) * 100 : 0;

      return {
        member,
        totalLeads: memberLeads.length,
        totalActivities: memberActivities.length,
        totalValue,
        wonValue,
        conversionRate,
        targetAchievement,
        monthlyTarget
      };
    });
  };

  const generateActivityReport = () => {
    let filteredActivities = activities;

    // Apply date range filters if provided
    if (dateFrom || dateTo) {
      filteredActivities = activities.filter(activity => {
        const activityDate = new Date(activity.timestamp);
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo) : null;

        if (fromDate && toDate) {
          return activityDate >= fromDate && activityDate <= toDate;
        } else if (fromDate) {
          return activityDate >= fromDate;
        } else if (toDate) {
          return activityDate <= toDate;
        }
        return true;
      });
    }

    // Filter by selected member
    if (selectedMember !== 'all') {
      filteredActivities = filteredActivities.filter(activity => activity.userId === selectedMember);
    }

    // Group activities by user
    const activityByUser = salesMembers.map(member => {
      const memberActivities = filteredActivities.filter(activity => activity.userId === member.id);

      const activityBreakdown = {
        call: memberActivities.filter(a => a.type === 'call').length,
        email: memberActivities.filter(a => a.type === 'email').length,
        whatsapp: memberActivities.filter(a => a.type === 'whatsapp').length,
        meeting: memberActivities.filter(a => a.type === 'meeting').length,
        note: memberActivities.filter(a => a.type === 'note').length,
      };

      return {
        member,
        totalActivities: memberActivities.length,
        activityBreakdown,
        activities: memberActivities
      };
    });

    // Calculate overall totals
    const totalActivities = filteredActivities.length;
    const activityTypeBreakdown = {
      call: filteredActivities.filter(a => a.type === 'call').length,
      email: filteredActivities.filter(a => a.type === 'email').length,
      whatsapp: filteredActivities.filter(a => a.type === 'whatsapp').length,
      meeting: filteredActivities.filter(a => a.type === 'meeting').length,
      note: filteredActivities.filter(a => a.type === 'note').length,
    };

    return {
      activityByUser,
      totalActivities,
      activityTypeBreakdown,
      filteredActivities
    };
  };

  const handleExportReport = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const dateStr = new Date().toISOString().split('T')[0];

      // Get filtered data
      const { filteredLeads, filteredActivities } = getFilteredData();

      // Get selected member name for filename
      const memberName = selectedMember !== 'all'
        ? salesMembers.find(m => m.id === selectedMember)?.name || 'Unknown'
        : 'All Members';

      // Get date range label
      const dateRangeLabel = {
        'week': 'Last 7 Days',
        'month': 'Last Month',
        'quarter': 'Last 3 Months',
        'year': 'Last 6 Months'
      }[dateRange] || 'All Time';

      if (reportType === 'lead') {
        // LEAD REPORT EXPORT
        const leadReport = generateLeadReport();

        // Sheet 1: Summary
        const summaryData = [
          ['ZOOPITER CRM - LEAD REPORT'],
          [''],
          ['Report Generated:', new Date().toLocaleString()],
          ['Date Range:', dateRangeLabel],
          ['Team Member:', memberName],
          [''],
          ['SUMMARY METRICS'],
          ['Total Leads', leadReport.totalLeads],
          ['Total Pipeline Value', `₹${leadReport.totalValue.toLocaleString()}`],
          ['Won Value', `₹${leadReport.wonValue.toLocaleString()}`],
          ['Conversion Rate', `${Math.round(leadReport.conversionRate)}%`],
          [''],
          ['STATUS BREAKDOWN'],
          ['Status', 'Count'],
          ...Object.entries(leadReport.statusBreakdown).map(([status, count]) => [
            status.replace('_', ' ').toUpperCase(),
            count
          ]),
          [''],
          ['SOURCE BREAKDOWN'],
          ['Source', 'Count'],
          ...Object.entries(leadReport.sourceBreakdown).map(([source, count]) => [
            source,
            count
          ])
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

        // Set column widths for summary
        summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];

        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

        // Sheet 2: Detailed Lead Data
        const leadsData = [
          [
            'Company Name',
            'Client Name',
            'Designation',
            'Mobile No.',
            'Email',
            'Status',
            'Priority',
            'Expected Value (₹)',
            'Source',
            'Category',
            'Audience',
            'Assigned To',
            'Created Date',
            'Last Contact',
            'Next Follow-up',
            'Notes'
          ],
          ...filteredLeads.map(lead => [
            lead.companyName,
            lead.contactName,
            lead.designation || '',
            lead.phone,
            lead.email,
            lead.status.replace('_', ' ').toUpperCase(),
            lead.priority.toUpperCase(),
            lead.value,
            lead.source,
            lead.category || '',
            lead.audience || '',
            lead.assignedToName || 'Unassigned',
            new Date(lead.createdAt).toLocaleDateString(),
            lead.lastContact ? new Date(lead.lastContact).toLocaleDateString() : '',
            lead.nextFollowUp ? new Date(lead.nextFollowUp).toLocaleDateString() : '',
            lead.notes
          ])
        ];
        const leadsSheet = XLSX.utils.aoa_to_sheet(leadsData);

        // Set column widths for leads
        leadsSheet['!cols'] = [
          { wch: 25 }, // Company
          { wch: 20 }, // Client Name
          { wch: 18 }, // Designation
          { wch: 15 }, // Mobile No.
          { wch: 25 }, // Email
          { wch: 15 }, // Status
          { wch: 10 }, // Priority
          { wch: 15 }, // Value
          { wch: 12 }, // Source
          { wch: 12 }, // Category
          { wch: 10 }, // Audience
          { wch: 20 }, // Assigned To
          { wch: 12 }, // Created
          { wch: 12 }, // Last Contact
          { wch: 12 }, // Next Follow-up
          { wch: 30 }  // Notes
        ];

        XLSX.utils.book_append_sheet(workbook, leadsSheet, 'Lead Details');

      } else if (reportType === 'employee') {
        // REVENUE REPORT EXPORT (Employee Performance)
        const employeeReport = generateEmployeeReport();

        // Filter report if specific member selected
        const filteredReport = selectedMember !== 'all'
          ? employeeReport.filter(r => r.member.id === selectedMember)
          : employeeReport;

        // Sheet 1: Summary
        const summaryData = [
          ['ZOOPITER CRM - REVENUE REPORT'],
          [''],
          ['Report Generated:', new Date().toLocaleString()],
          ['Date Range:', dateRangeLabel],
          ['Team Member:', memberName],
          [''],
          ['PERFORMANCE SUMMARY'],
          ['Employee', 'Total Leads', 'Activities', 'Pipeline Value (₹)', 'Won Value (₹)', 'Conversion Rate', 'Target Achievement'],
          ...filteredReport.map(report => [
            report.member.name,
            report.totalLeads,
            report.totalActivities,
            `₹${report.totalValue.toLocaleString()}`,
            `₹${report.wonValue.toLocaleString()}`,
            `${Math.round(report.conversionRate)}%`,
            report.monthlyTarget
              ? `${Math.round(report.targetAchievement)}% (₹${report.monthlyTarget.achieved.toLocaleString()} / ₹${report.monthlyTarget.target.toLocaleString()})`
              : 'No Target Set'
          ])
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

        // Set column widths
        summarySheet['!cols'] = [
          { wch: 20 }, // Employee
          { wch: 12 }, // Leads
          { wch: 12 }, // Activities
          { wch: 18 }, // Pipeline
          { wch: 18 }, // Won
          { wch: 15 }, // Conversion
          { wch: 35 }  // Target
        ];

        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Performance Summary');

        // Sheet 2: Detailed breakdown for each employee
        for (const report of filteredReport) {
          const memberLeads = filteredLeads.filter(lead => lead.assignedTo === report.member.id);
          const memberActivities = filteredActivities.filter(activity => activity.userId === report.member.id);

          const memberData = [
            [`${report.member.name.toUpperCase()} - DETAILED REPORT`],
            [''],
            ['Email:', report.member.email],
            ['Period:', dateRangeLabel],
            [''],
            ['METRICS'],
            ['Total Leads', report.totalLeads],
            ['Total Activities', report.totalActivities],
            ['Pipeline Value', `₹${report.totalValue.toLocaleString()}`],
            ['Won Value', `₹${report.wonValue.toLocaleString()}`],
            ['Conversion Rate', `${Math.round(report.conversionRate)}%`],
            ['Monthly Target', report.monthlyTarget ? `₹${report.monthlyTarget.target.toLocaleString()}` : 'Not Set'],
            ['Target Achieved', report.monthlyTarget ? `₹${report.monthlyTarget.achieved.toLocaleString()}` : 'N/A'],
            ['Achievement %', report.monthlyTarget ? `${Math.round(report.targetAchievement)}%` : 'N/A'],
            [''],
            ['ASSIGNED LEADS'],
            ['Company', 'Client Name', 'Status', 'Priority', 'Value (₹)', 'Source', 'Created Date'],
            ...memberLeads.map(lead => [
              lead.companyName,
              lead.contactName,
              lead.status.replace('_', ' ').toUpperCase(),
              lead.priority.toUpperCase(),
              lead.value,
              lead.source,
              new Date(lead.createdAt).toLocaleDateString()
            ]),
            [''],
            ['RECENT ACTIVITIES'],
            ['Date', 'Type', 'Lead', 'Description'],
            ...memberActivities.slice(0, 20).map(activity => {
              const lead = leads.find(l => l.id === activity.leadId);
              return [
                new Date(activity.timestamp).toLocaleString(),
                activity.type.toUpperCase(),
                lead?.companyName || 'Unknown',
                activity.description
              ];
            })
          ];

          const memberSheet = XLSX.utils.aoa_to_sheet(memberData);

          // Set column widths
          memberSheet['!cols'] = [
            { wch: 25 },
            { wch: 20 },
            { wch: 15 },
            { wch: 12 },
            { wch: 15 },
            { wch: 12 },
            { wch: 15 }
          ];

          // Sanitize sheet name (max 31 chars, no special chars)
          const sheetName = report.member.name.substring(0, 31).replace(/[:\\/?*\[\]]/g, '');
          XLSX.utils.book_append_sheet(workbook, memberSheet, sheetName);
        }
      } else if (reportType === 'activity') {
        // ACTIVITY REPORT EXPORT
        const activityReport = generateActivityReport();

        // Get date range label for activity report
        const activityDateRangeLabel = dateFrom && dateTo
          ? `${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}`
          : dateFrom
            ? `From ${new Date(dateFrom).toLocaleDateString()}`
            : dateTo
              ? `Until ${new Date(dateTo).toLocaleDateString()}`
              : 'All Time';

        // Filter report if specific member selected
        const filteredActivityReport = selectedMember !== 'all'
          ? activityReport.activityByUser.filter(r => r.member.id === selectedMember)
          : activityReport.activityByUser;

        // Sheet 1: Summary
        const summaryData = [
          ['ZOOPITER CRM - ACTIVITY REPORT'],
          [''],
          ['Report Generated:', new Date().toLocaleString()],
          ['Date Range:', activityDateRangeLabel],
          ['Team Member:', memberName],
          [''],
          ['OVERALL SUMMARY'],
          ['Total Activities', activityReport.totalActivities],
          ['Calls', activityReport.activityTypeBreakdown.call],
          ['Emails', activityReport.activityTypeBreakdown.email],
          ['WhatsApp', activityReport.activityTypeBreakdown.whatsapp],
          ['Meetings', activityReport.activityTypeBreakdown.meeting],
          ['Notes', activityReport.activityTypeBreakdown.note],
          [''],
          ['ACTIVITY BREAKDOWN BY SALESPERSON'],
          ['Salesperson', 'Total Activities', 'Calls', 'Emails', 'WhatsApp', 'Meetings', 'Notes'],
          ...filteredActivityReport.map(report => [
            report.member.name,
            report.totalActivities,
            report.activityBreakdown.call,
            report.activityBreakdown.email,
            report.activityBreakdown.whatsapp,
            report.activityBreakdown.meeting,
            report.activityBreakdown.note
          ])
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

        // Set column widths
        summarySheet['!cols'] = [
          { wch: 25 }, // Salesperson
          { wch: 18 }, // Total
          { wch: 12 }, // Calls
          { wch: 12 }, // Emails
          { wch: 12 }, // WhatsApp
          { wch: 12 }, // Meetings
          { wch: 12 }  // Notes
        ];

        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Activity Summary');

        // Sheet 2: Detailed Activity Records
        const activityDetailsData = [
          ['Date & Time', 'Salesperson', 'Type', 'Lead/Company', 'Description'],
          ...activityReport.filteredActivities.map(activity => {
            const member = salesMembers.find(m => m.id === activity.userId);
            const lead = leads.find(l => l.id === activity.leadId);
            return [
              new Date(activity.timestamp).toLocaleString(),
              member?.name || 'Unknown',
              activity.type.toUpperCase(),
              lead?.companyName || 'Unknown',
              activity.description
            ];
          })
        ];
        const activityDetailsSheet = XLSX.utils.aoa_to_sheet(activityDetailsData);

        // Set column widths
        activityDetailsSheet['!cols'] = [
          { wch: 20 }, // Date & Time
          { wch: 20 }, // Salesperson
          { wch: 12 }, // Type
          { wch: 25 }, // Lead
          { wch: 40 }  // Description
        ];

        XLSX.utils.book_append_sheet(workbook, activityDetailsSheet, 'Activity Details');

        // Sheet 3: Individual salesperson sheets (if not filtering by specific member)
        if (selectedMember === 'all') {
          for (const report of filteredActivityReport.slice(0, 10)) { // Limit to 10 sheets
            const memberData = [
              [`${report.member.name.toUpperCase()} - ACTIVITY REPORT`],
              [''],
              ['Email:', report.member.email],
              ['Period:', activityDateRangeLabel],
              [''],
              ['ACTIVITY SUMMARY'],
              ['Total Activities', report.totalActivities],
              ['Calls', report.activityBreakdown.call],
              ['Emails', report.activityBreakdown.email],
              ['WhatsApp', report.activityBreakdown.whatsapp],
              ['Meetings', report.activityBreakdown.meeting],
              ['Notes', report.activityBreakdown.note],
              [''],
              ['RECENT ACTIVITIES'],
              ['Date & Time', 'Type', 'Lead/Company', 'Description'],
              ...report.activities.slice(0, 50).map(activity => {
                const lead = leads.find(l => l.id === activity.leadId);
                return [
                  new Date(activity.timestamp).toLocaleString(),
                  activity.type.toUpperCase(),
                  lead?.companyName || 'Unknown',
                  activity.description
                ];
              })
            ];

            const memberSheet = XLSX.utils.aoa_to_sheet(memberData);

            // Set column widths
            memberSheet['!cols'] = [
              { wch: 20 },
              { wch: 12 },
              { wch: 25 },
              { wch: 40 }
            ];

            // Sanitize sheet name
            const sheetName = report.member.name.substring(0, 31).replace(/[:\\/?*\[\]]/g, '');
            XLSX.utils.book_append_sheet(workbook, memberSheet, sheetName);
          }
        }
      }

      // Generate filename
      const memberSuffix = selectedMember !== 'all'
        ? `_${memberName.replace(/\s+/g, '_')}`
        : '';
      const reportTypeName = reportType === 'lead' ? 'Lead' : reportType === 'activity' ? 'Activity' : 'Revenue';
      const filename = `Zoopiter_${reportTypeName}_Report${memberSuffix}_${dateStr}.xlsx`;

      // Write and download
      XLSX.writeFile(workbook, filename);

      // Show success toast
      toast.success('📊 Report exported successfully!', {
        description: `${filename} has been downloaded`
      });

    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report', {
        description: 'Please try again or contact support'
      });
    }
  };

  const leadReport = useMemo(() => generateLeadReport(), [leads, activities, dateRange, selectedMember]);
  const employeeReport = useMemo(() => generateEmployeeReport(), [leads, activities, salesMembers, targets, dateRange, selectedMember]);
  const activityReport = useMemo(() => generateActivityReport(), [activities, salesMembers, leads, selectedMember, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Reports & Analytics</h3>
          <p className="text-muted-foreground">Generate detailed reports for leads and team performance</p>
        </div>
        <Button onClick={handleExportReport} className="flex items-center space-x-2 bg-[rgb(0,0,0)]">
          <Download className="h-4 w-4" />
          <span>Export Report</span>
        </Button>
      </div>

      {/* Report Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Customize your report parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead Report</SelectItem>
                  <SelectItem value="employee">Revenue Report</SelectItem>
                  <SelectItem value="activity">Activity Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange} disabled={reportType === 'activity'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last 3 Months</SelectItem>
                  <SelectItem value="year">Last 6 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Team Member</Label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {salesMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range Filters for Activity Report */}
          {reportType === 'activity' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="invisible">Clear</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="w-auto px-3"
                  disabled={!dateFrom && !dateTo}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {reportType === 'lead' ? (
        // Lead Report
        <div className="space-y-6">
          {/* Lead Summary */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leadReport.totalLeads}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <span className="text-muted-foreground">₹</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leadReport.totalValue.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Won Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{leadReport.wonValue.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(leadReport.conversionRate)}%</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(leadReport.statusBreakdown).map(([status, count]) => {
                        return {
                          name: status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1),
                          value: count,
                          color: getStatusSpecificColor(status),
                          originalStatus: status
                        };
                      })}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={100}
                      innerRadius={30}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={1}
                    >
                      {Object.entries(leadReport.statusBreakdown).map(([status], index) => {
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={getStatusSpecificColor(status)}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                {/* Enhanced Legend with counts and percentages */}
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {Object.entries(leadReport.statusBreakdown).map(([status, count]) => {
                    const totalLeads = Object.values(leadReport.statusBreakdown).reduce((sum, val) => sum + val, 0);
                    const percentage = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(0) : '0';

                    // Only show statuses that have leads
                    if (count === 0) return null;

                    return (
                      <div key={status} className="flex items-center gap-2 text-xs">
                        <div className={`w-3 h-3 rounded-sm border border-gray-200 ${getStatusSpecificTailwindClass(status)}`}></div>
                        <span className="font-medium">
                          {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                        </span>
                        <span className="text-muted-foreground">
                          {count} ({percentage}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Source Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Source Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(leadReport.sourceBreakdown).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between">
                      <span>{source}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : reportType === 'employee' ? (
        // Employee Report
        <Card>
          <CardHeader>
            <CardTitle>Employee Performance Report</CardTitle>
            <CardDescription>Detailed performance metrics for each team member</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Total Leads</TableHead>
                  <TableHead>Activities</TableHead>
                  <TableHead>Pipeline Value</TableHead>
                  <TableHead>Won Value</TableHead>
                  <TableHead>Conversion Rate</TableHead>
                  <TableHead>Target Achievement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeReport.map((report) => (
                  <TableRow key={report.member.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{report.member.name}</div>
                        <div className="text-sm text-muted-foreground">{report.member.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{report.totalLeads}</TableCell>
                    <TableCell>{report.totalActivities}</TableCell>
                    <TableCell>₹{report.totalValue.toLocaleString()}</TableCell>
                    <TableCell>₹{report.wonValue.toLocaleString()}</TableCell>
                    <TableCell>{Math.round(report.conversionRate)}%</TableCell>
                    <TableCell>
                      {report.monthlyTarget ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {Math.round(report.targetAchievement)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ₹{report.monthlyTarget.achieved.toLocaleString()} / ₹{report.monthlyTarget.target.toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline">No target</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        // Activity Report
        <div className="space-y-6">
          {/* Activity Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                <ActivityIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activityReport.totalActivities}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Calls</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activityReport.activityTypeBreakdown.call}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Emails</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activityReport.activityTypeBreakdown.email}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">WhatsApp</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activityReport.activityTypeBreakdown.whatsapp}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Meetings</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activityReport.activityTypeBreakdown.meeting}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Notes</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activityReport.activityTypeBreakdown.note}</div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Breakdown by Salesperson */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Breakdown by Salesperson</CardTitle>
              <CardDescription>
                {dateFrom && dateTo
                  ? `Activities from ${new Date(dateFrom).toLocaleDateString()} to ${new Date(dateTo).toLocaleDateString()}`
                  : dateFrom
                    ? `Activities from ${new Date(dateFrom).toLocaleDateString()}`
                    : dateTo
                      ? `Activities until ${new Date(dateTo).toLocaleDateString()}`
                      : 'All activities'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salesperson</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Calls</TableHead>
                    <TableHead className="text-center">Emails</TableHead>
                    <TableHead className="text-center">WhatsApp</TableHead>
                    <TableHead className="text-center">Meetings</TableHead>
                    <TableHead className="text-center">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityReport.activityByUser.map((report) => (
                    <TableRow key={report.member.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{report.member.name}</div>
                          <div className="text-sm text-muted-foreground">{report.member.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{report.totalActivities}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{report.activityBreakdown.call}</TableCell>
                      <TableCell className="text-center">{report.activityBreakdown.email}</TableCell>
                      <TableCell className="text-center">{report.activityBreakdown.whatsapp}</TableCell>
                      <TableCell className="text-center">{report.activityBreakdown.meeting}</TableCell>
                      <TableCell className="text-center">{report.activityBreakdown.note}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}