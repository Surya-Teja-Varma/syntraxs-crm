import React, { useState, useMemo, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { isFirebaseEnabled } from '../../config/firebase';
import {
  Plus,
  Upload,
  Search,
  Mail,
  Phone,
  Calendar,
  Clipboard,
  Trash2,
  Building2,
  User as UserIcon,
  Briefcase,
  FileText,

  Activity as ActivityIcon,
  Download,
  Clock,
  Users
} from 'lucide-react';
import { User, Lead, Activity } from '../../types';
import { getActivitiesByLead } from '../../services/activityService';

interface LeadManagementProps {
  leads: Lead[];
  salesMembers: User[];
  currentUser?: User;
  onUpdateLead: (leadId: string, updates: Partial<Lead>) => void;
  onAddLead: (lead: Omit<Lead, 'id'>) => void;
  onDeleteLead: (leadId: string) => void;
}

export function LeadManagement({ leads, salesMembers, currentUser, onUpdateLead, onAddLead, onDeleteLead }: LeadManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [assignedToFilter, setAssignedToFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);
  const [bulkAssignMember, setBulkAssignMember] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedLeadHistory, setSelectedLeadHistory] = useState<Lead | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedLeadDetails, setSelectedLeadDetails] = useState<Lead | null>(null);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [isLeadDetailsDialogOpen, setIsLeadDetailsDialogOpen] = useState(false);
  const [leadActivities, setLeadActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [newLead, setNewLead] = useState({
    companyName: '',
    contactName: '',
    designation: '',
    requirement: '',
    email: '',
    phone: '',
    industry: '',
    category: '',
    source: '',
    audience: '',
    value: 0,
    status: 'new' as Lead['status'],
    priority: 'medium' as Lead['priority'],
    notes: ''
  });

  // Debounce search term to reduce filtering re-calculations
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, categoryFilter, assignedToFilter, showUnassigned, showOnlySelected, dateFromFilter, dateToFilter]);

  // Base filtered leads (without showOnlySelected filter) - used for serial number calculation
  const baseFilteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Enhanced date search logic
      const leadDate = new Date(lead.createdAt);
      const formattedDate = leadDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).toLowerCase(); // "11 feb 2026"
      const simpleDate = leadDate.toLocaleDateString('en-GB'); // "11/02/2026"
      const isoDate = leadDate.toLocaleDateString('en-CA'); // "2026-02-11"

      const matchesSearch = lead.companyName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        lead.contactName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (lead.phone && lead.phone.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (lead.email && lead.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        formattedDate.includes(debouncedSearchTerm.toLowerCase()) ||
        simpleDate.includes(debouncedSearchTerm.toLowerCase()) ||
        isoDate.includes(debouncedSearchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || lead.category === categoryFilter;
      const matchesAssignedTo = assignedToFilter === 'all' || lead.assignedTo === assignedToFilter;
      const matchesUnassigned = !showUnassigned || !lead.assignedTo;

      // Enhanced date filtering with range support
      let matchesDate = true;
      if (dateFromFilter || dateToFilter) {
        const leadDate = new Date(lead.createdAt);
        // Fix timezone issue by using local date string
        const leadDateStr = new Date(leadDate.getTime() - (leadDate.getTimezoneOffset() * 60000))
          .toISOString().split('T')[0];

        if (dateFromFilter && dateToFilter) {
          matchesDate = leadDateStr >= dateFromFilter && leadDateStr <= dateToFilter;
        } else if (dateFromFilter) {
          matchesDate = leadDateStr >= dateFromFilter;
        } else if (dateToFilter) {
          matchesDate = leadDateStr <= dateToFilter;
        }
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesAssignedTo && matchesUnassigned && matchesDate;
    });
  }, [leads, debouncedSearchTerm, statusFilter, categoryFilter, assignedToFilter, showUnassigned, dateFromFilter, dateToFilter]);

  // Filtered leads with showOnlySelected applied - used for display
  const filteredLeads = useMemo(() => {
    if (showOnlySelected) {
      return baseFilteredLeads.filter(lead => selectedLeads.includes(lead.id));
    }
    return baseFilteredLeads;
  }, [baseFilteredLeads, showOnlySelected, selectedLeads]);

  // Memoize status counts to avoid recalculating on every render
  const statusCounts = useMemo(() => ({
    new: filteredLeads.filter(l => l.status === 'new').length,
    quotation_sent: filteredLeads.filter(l => l.status === 'quotation_sent').length,
    interested: filteredLeads.filter(l => l.status === 'interested').length,
    not_able_to_contact: filteredLeads.filter(l => l.status === 'not_able_to_contact').length,
    not_interested: filteredLeads.filter(l => l.status === 'not_interested').length,
    won: filteredLeads.filter(l => l.status === 'won').length,
    pending_payment: filteredLeads.filter(l => l.status === 'pending_payment').length,
    follow_up: filteredLeads.filter(l => l.status === 'follow_up').length,
    lost: filteredLeads.filter(l => l.status === 'lost').length
  }), [filteredLeads]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLeads, currentPage, itemsPerPage]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setAssignedToFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
    setShowUnassigned(false);
    setShowOnlySelected(false);
    setSelectedLeads([]);
  }, []);

  // Bulk assignment functions - wrapped in useCallback to prevent re-renders
  const handleSelectLead = useCallback((leadId: string, checked: boolean) => {
    setSelectedLeads(prev =>
      checked ? [...prev, leadId] : prev.filter(id => id !== leadId)
    );
  }, []);

  const handleSelectAllLeads = useCallback((checked: boolean) => {
    setSelectedLeads(checked ? filteredLeads.map(lead => lead.id) : []);
  }, [filteredLeads]);

  const handleRangeSelect = useCallback(() => {
    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);

    if (isNaN(start) || isNaN(end)) {
      toast.error('Please enter valid numbers for range');
      return;
    }

    if (start < 1 || end < start) {
      toast.error('Invalid range');
      return;
    }

    // Visual index is 1-based, so subtract 1 for array index
    const startIndex = start - 1;
    // End index for slice is exclusive, so we use 'end' directly to include the visual 'end' item
    // e.g., 1 to 5 -> indices 0, 1, 2, 3, 4 -> slice(0, 5)

    if (startIndex >= filteredLeads.length) {
      toast.error('Start range is out of bounds');
      return;
    }

    const leadsToSelect = filteredLeads.slice(startIndex, end);

    if (leadsToSelect.length === 0) {
      toast.error('No leads found in the specified range');
      return;
    }

    const newSelectedIds = leadsToSelect.map(l => l.id);
    setSelectedLeads(newSelectedIds);

    // Enable "Show Only Selected" filter
    setShowOnlySelected(true);

    // Calculate which page contains the start of the selected range
    const pageNumber = Math.floor(startIndex / itemsPerPage) + 1;
    setCurrentPage(pageNumber);

    toast.success(`Showing ${newSelectedIds.length} selected leads`);

  }, [rangeStart, rangeEnd, filteredLeads, itemsPerPage]);

  const handleBulkAssign = useCallback(() => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads to assign');
      return;
    }
    setIsBulkAssignDialogOpen(true);
  }, [selectedLeads.length]);

  const handleBulkAssignConfirm = useCallback(() => {
    if (!bulkAssignMember) {
      toast.error('Please select a sales member');
      return;
    }

    const salesMember = salesMembers.find(member => member.id === bulkAssignMember);
    if (!salesMember) {
      toast.error('Invalid sales member selected');
      return;
    }

    const count = selectedLeads.length;
    // Assign all selected leads to the chosen sales member
    selectedLeads.forEach(leadId => {
      handleAssignLead(leadId, bulkAssignMember);
    });

    // Reset selections
    setSelectedLeads([]);
    setBulkAssignMember('');
    setIsBulkAssignDialogOpen(false);

    toast.success(`Successfully assigned ${count} leads to ${salesMember.name}`);
  }, [bulkAssignMember, salesMembers, selectedLeads]);

  // Predefined category options
  const categoryOptions = [
    'Web & App Development',
    'Social Media & Ads Management',
    'Digital Marketing',
    'ERP & CRM Tools'
  ];

  const handleAddLead = useCallback(() => {
    if (!newLead.companyName || !newLead.contactName) {
      toast.error('Please fill in all required fields');
      return;
    }

    onAddLead({
      ...newLead,
      createdAt: new Date().toISOString(),
      callHistory: [],
      productsOffered: []
    });

    setNewLead({
      companyName: '',
      contactName: '',
      designation: '',
      requirement: '',
      email: '',
      phone: '',
      industry: '',
      category: '',
      source: '',
      audience: '',
      value: 0,
      status: 'new',
      priority: 'medium',
      notes: ''
    });

    setIsAddDialogOpen(false);
    toast.success('Lead added successfully');
  }, [newLead, onAddLead]);

  const handleAssignLead = useCallback((leadId: string, salesMemberId: string) => {
    const salesMember = salesMembers.find(member => member.id === salesMemberId);
    const lead = leads.find(l => l.id === leadId);

    if (!salesMember || !lead) {
      toast.error('Invalid assignment data');
      return;
    }

    const historyEntry = {
      type: 'assignment_change' as const,
      timestamp: new Date().toISOString(),
      changedBy: currentUser?.id || undefined,
      changedByName: currentUser?.name || undefined,
      oldValue: lead.assignedTo || undefined,
      newValue: salesMemberId,
      details: `Lead assigned to ${salesMember.name} by ${currentUser?.name || 'Unknown'}`
    };

    // Only include defined values in the update
    const updateData: Partial<Lead> = {
      assignedTo: salesMemberId,
      assignedToName: salesMember.name
    };

    // Only add history if Firebase is not enabled (to avoid Firebase issues with complex objects)
    if (!isFirebaseEnabled()) {
      updateData.history = [...(lead.history || []), historyEntry];
    }

    onUpdateLead(leadId, updateData);
    toast.success('Lead assigned successfully');
  }, [salesMembers, leads, currentUser, onUpdateLead]);

  const handleDeleteLead = useCallback((leadId: string) => {
    onDeleteLead(leadId);
    toast.success('Lead deleted successfully');
  }, [onDeleteLead]);

  const handleStatusChange = useCallback((leadId: string, status: Lead['status']) => {
    const lead = leads.find(l => l.id === leadId);

    const historyEntry = {
      type: 'status_change' as const,
      timestamp: new Date().toISOString(),
      changedBy: currentUser?.id,
      changedByName: currentUser?.name,
      oldValue: lead?.status,
      newValue: status,
      details: `Status changed to '${status}' by ${currentUser?.name || 'Unknown'}`
    };

    onUpdateLead(leadId, {
      status,
      history: [...(lead?.history || []), historyEntry]
    });
    toast.success('Status updated successfully');
  }, [leads, currentUser, onUpdateLead]);

  const handleDownloadTemplate = useCallback(() => {
    // Create CSV template with headers
    const headers = [
      'Company Name*',
      'Client Name*',
      'Designation',
      'Requirement',
      'Mobile No.',
      'Category',
      'Source',
      'Audience',
      'Date',
      'Expected value ₹',
      'Priority',
      'Status',
      'Notes'
    ];

    const sampleRow = [
      'Sample Company Pvt Ltd',
      'John Doe',
      'Manager',
      'Looking for CRM solution',
      '+91 9876543210',
      'Technology',
      'Website',
      'B2B',
      '2023-10-25',
      '50000',
      'medium',
      'new',
      'This is a sample lead'
    ];

    const csvContent = [
      headers.join(','),
      sampleRow.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'zoopiter_leads_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Template downloaded successfully!');
  }, []);

  // ... (existing helper function if needed, but we will inline or keep logic inside handleExcelUpload)

  const handleExcelUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!jsonData || jsonData.length < 2) {
          toast.error('File is empty or invalid');
          return;
        }

        // Headers are the first row
        const headers = (jsonData[0] as string[]).map((h: string) => String(h).trim().replace(/[*"]/g, ''));
        const leadsToImport: any[] = [];



        for (let i = 1; i < jsonData.length; i++) {
          const values = jsonData[i] as any[];
          if (!values || values.length === 0) continue;

          const leadData: any = {};

          headers.forEach((header, index) => {
            const headerLower = header.toLowerCase();
            const value = values[index];

            // Skip undefined values
            if (value === undefined || value === null) return;

            // Normalize value to string for text fields, but keep dates/numbers as is if needed
            const strValue = String(value).trim();

            if (headerLower.includes('company')) leadData.companyName = strValue;
            else if (headerLower.includes('contact') || headerLower.includes('client')) leadData.contactName = strValue;
            else if (headerLower.includes('designation')) leadData.designation = strValue;
            else if (headerLower.includes('requirement')) leadData.requirement = strValue;
            else if (headerLower.includes('email')) leadData.email = strValue;
            else if (headerLower.includes('phone') || headerLower.includes('mobile')) leadData.phone = strValue;
            else if (headerLower.includes('category')) leadData.category = strValue;
            else if (headerLower.includes('industry')) leadData.industry = strValue;
            else if (headerLower.includes('source')) leadData.source = strValue || 'Excel Import';
            else if (headerLower.includes('audience')) leadData.audience = strValue;
            else if (headerLower.includes('date') || headerLower.includes('created')) {


              if (value instanceof Date) {
                // XLSX parsed it as a Date object
                leadData.createdAt = value.toISOString();

              } else if (typeof value === 'number') {
                // Excel serial date (should have been handled by cellDates: true, but just in case)
                // Excel base date is Dec 30 1899
                const date = new Date((value - (25567 + 2)) * 86400 * 1000);
                leadData.createdAt = date.toISOString();

              } else if (strValue) {
                // Try standard parsing
                let date = new Date(strValue);

                // If invalid, try DD/MM/YYYY
                if (isNaN(date.getTime())) {
                  const parts = strValue.split(/[-/]/);
                  if (parts.length === 3) {
                    let d = parseInt(parts[0], 10);
                    let m = parseInt(parts[1], 10) - 1;
                    let y = parseInt(parts[2], 10);

                    // YYYY-MM-DD
                    if (parts[0].length === 4) {
                      y = parseInt(parts[0], 10);
                      m = parseInt(parts[1], 10) - 1;
                      d = parseInt(parts[2], 10);
                    }

                    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
                      const tempDate = new Date(y, m, d);
                      if (!isNaN(tempDate.getTime())) {
                        date = tempDate;
                      }
                    }
                  }
                }

                if (!isNaN(date.getTime())) {
                  const offset = date.getTimezoneOffset() * 60000;
                  const localDate = new Date(date.getTime() - offset);
                  leadData.createdAt = localDate.toISOString();

                }
              }
            }
            else if (headerLower.includes('value')) leadData.value = Number(value) || 0;
            else if (headerLower.includes('status')) leadData.status = strValue || 'new';
            else if (headerLower.includes('priority')) leadData.priority = strValue || 'medium';
            else if (headerLower.includes('note')) leadData.notes = strValue;
          });

          // Validate required fields
          if (leadData.companyName && leadData.contactName) {
            leadsToImport.push(leadData);
          }
        }

        if (leadsToImport.length === 0) {
          toast.error('No valid leads found in file. Please check required fields.');
          return;
        }

        // Import leads
        toast.success(`Processing ${leadsToImport.length} leads...`);

        // Use sequential processing with small delay to ensure order
        const processLeads = async () => {
          for (let i = 0; i < leadsToImport.length; i++) {
            // Small delay to prevent UI freezing
            if (i % 10 === 0) await new Promise(resolve => setTimeout(resolve, 10));

            onAddLead({
              ...leadsToImport[i],
              callHistory: [],
              productsOffered: []
            });
          }
          toast.success(`Successfully imported ${leadsToImport.length} leads!`);
          setIsUploadDialogOpen(false);
        };

        processLeads();

      } catch (error: any) {
        toast.error('Error processing file. Please check the format.');
        console.error('Excel processing error:', error);
      }
    };

    reader.onerror = () => {
      toast.error('Error reading file');
    };

    reader.readAsBinaryString(file);

    // Reset input
    event.target.value = '';
  }, [onAddLead]);

  const getPriorityColor = useCallback((priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  }, []);

  const handleShowHistory = useCallback((lead: Lead) => {
    setSelectedLeadHistory(lead);
    setIsHistoryDialogOpen(true);
  }, []);

  const formatTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }, []);

  const handleShowLeadDetails = useCallback(async (lead: Lead) => {
    setSelectedLeadDetails(lead);
    setIsLeadDetailsDialogOpen(true);
    setLoadingActivities(true);

    // Fetch activities for this lead
    try {
      const activities = await getActivitiesByLead(lead.id);
      setLeadActivities(activities);
    } catch (error) {
      console.error('Error fetching lead activities:', error);
      setLeadActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'meeting':
        return <Users className="h-4 w-4" />;
      case 'whatsapp':
        return <Phone className="h-4 w-4" />;
      case 'note':
        return <FileText className="h-4 w-4" />;
      default:
        return <ActivityIcon className="h-4 w-4" />;
    }
  };

  const handleExportLeads = useCallback(() => {
    if (filteredLeads.length === 0) {
      toast.error('No leads to export');
      return;
    }

    const headers = [
      'Company Name',
      'Client Name',
      'Designation',
      'Requirement',
      'Mobile No.',
      'Email',
      'Category',
      'Source',
      'Audience',
      'Value',
      'Date',
      'Status',
      'Priority',
      'Assigned To',
      'Notes'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredLeads.map(lead => [
        `"${(lead.companyName || '').replace(/"/g, '""')}"`,
        `"${(lead.contactName || '').replace(/"/g, '""')}"`,
        `"${(lead.designation || '').replace(/"/g, '""')}"`,
        `"${(lead.requirement || '').replace(/"/g, '""')}"`,
        `"${(lead.phone || '').replace(/"/g, '""')}"`,
        `"${(lead.email || '').replace(/"/g, '""')}"`,
        `"${(lead.category || '').replace(/"/g, '""')}"`,
        `"${(lead.source || '').replace(/"/g, '""')}"`,
        `"${(lead.audience || '').replace(/"/g, '""')}"`,
        lead.value || 0,
        `"${new Date(lead.createdAt).toLocaleDateString('en-GB')}"`,
        `"${lead.status}"`,
        `"${lead.priority}"`,
        `"${(lead.assignedToName || 'Unassigned').replace(/"/g, '""')}"`,
        `"${(lead.notes || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Successfully exported ${filteredLeads.length} leads`);
  }, [filteredLeads]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Lead Management</h3>
          <p className="text-muted-foreground">Manage your sales leads and assignments</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Excel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Upload Leads from Excel/CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV or Excel file with your lead data. Make sure to include all required fields.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4 px-[0px] py-[10px]">
                {/* Column Information */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Required Columns */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3 flex items-center">
                      <span className="text-red-500 mr-2">*</span>
                      Required Columns
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <span className="text-red-500 mr-2">*</span>
                        Company Name
                      </li>
                      <li className="flex items-center">
                        <span className="text-red-500 mr-2">*</span>
                        Client Name
                      </li>
                      <li className="flex items-center">
                        <span className="text-red-500 mr-2">*</span>
                        Designation
                      </li>
                      <li className="flex items-center">
                        <span className="text-red-500 mr-2">*</span>
                        Requirement
                      </li>
                      <li className="flex items-center">
                        <span className="text-red-500 mr-2">*</span>
                        Mobile No.
                      </li>
                      <li className="flex items-center">
                        <span className="text-red-500 mr-2">*</span>
                        Source
                      </li>
                      <li className="flex items-center">
                        <span className="text-red-500 mr-2">*</span>
                        Category
                      </li>
                      <li className="flex items-center">
                        <span className="text-red-500 mr-2">*</span>
                        Audiance
                      </li>
                      <li className="flex items-center">
                        <span className="text-red-500 mr-2">*</span>
                        Date
                      </li>
                    </ul>
                  </div>

                  {/* Optional Columns */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Optional Columns</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                        Value
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                        Status
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                        Priority
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                        Notes
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Download Template Button */}
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={handleDownloadTemplate}
                    className="w-full max-w-md"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>

                {/* File Upload */}
                <div className="flex justify-center bg-[rgba(0,0,0,0.13)] rounded-[15px] m-[0px] p-[0px]">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleExcelUpload}
                    className="hidden"
                    id="excel-upload-input"
                    title="Upload CSV or Excel file with lead data"
                  />
                  <Label htmlFor="excel-upload-input" className="cursor-pointer">
                    <div className="flex items-center gap-3 p-0 m-0">
                      <div className="px-3 py-1.5 border border-gray-300 rounded-[10px] bg-[rgb(255,255,255)] hover:bg-gray-100 transition-colors text-justify px-[15px] py-[5px] m-[0px]">
                        <span className="text-sm text-center text-[14px] font-bold font-normal">Choose file</span>
                      </div>
                      <span className="text-sm text-muted-foreground text-center">No file chosen</span>
                    </div>
                  </Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[rgb(4,4,4)]">
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
                <DialogDescription>
                  Enter the details for the new lead
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={newLead.companyName}
                      onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })}
                      placeholder="Enter company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Client Name *</Label>
                    <Input
                      id="contactName"
                      value={newLead.contactName}
                      onChange={(e) => setNewLead({ ...newLead, contactName: e.target.value })}
                      placeholder="Enter client name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      value={newLead.designation}
                      onChange={(e) => setNewLead({ ...newLead, designation: e.target.value })}
                      placeholder="Enter designation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requirement">Requirement</Label>
                    <Input
                      id="requirement"
                      value={newLead.requirement}
                      onChange={(e) => setNewLead({ ...newLead, requirement: e.target.value })}
                      placeholder="Enter requirement"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile No.</Label>
                    <Input
                      id="phone"
                      value={newLead.phone}
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                      placeholder="Enter mobile number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={newLead.category} onValueChange={(value: string) => setNewLead({ ...newLead, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
                    <Select value={newLead.source} onValueChange={(value: string) => setNewLead({ ...newLead, source: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Website">Website</SelectItem>
                        <SelectItem value="Cold Call">Cold Call</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="Social Media">Social Media</SelectItem>
                        <SelectItem value="Email Campaign">Email Campaign</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="audience">Audience</Label>
                    <Input
                      id="audience"
                      value={newLead.audience}
                      onChange={(e) => setNewLead({ ...newLead, audience: e.target.value })}
                      placeholder="Enter audience (e.g., B2B, B2C)"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="value">Expected value ₹ </Label>
                    <Input
                      id="value"
                      type="number"
                      value={newLead.value}
                      onChange={(e) => setNewLead({ ...newLead, value: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={newLead.priority} onValueChange={(value: Lead['priority']) => setNewLead({ ...newLead, priority: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={newLead.status} onValueChange={(value: Lead['status']) => setNewLead({ ...newLead, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="quotation_sent">Quotation sent</SelectItem>
                        <SelectItem value="interested">Interested</SelectItem>
                        <SelectItem value="not-able-to-contact">Not able to contact</SelectItem>
                        <SelectItem value="not-interested">Not interested</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="pending-payment">Pending Payment</SelectItem>
                        <SelectItem value="follow-up">Follow-up</SelectItem>
                        <SelectItem value="dnp">DNP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newLead.notes}
                    onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                    placeholder="Enter any additional notes..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddLead}>Add Lead</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-[250px]"
              />
            </div>
            {/* Date Range Filters */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[130px] justify-start text-left"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateFromFilter ? (
                      new Date(dateFromFilter + 'T00:00:00').toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                    ) : (
                      <span className="text-muted-foreground">From Date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateFromFilter ? new Date(dateFromFilter + 'T00:00:00') : undefined}
                    onSelect={(date: Date | undefined) => {
                      if (date) {
                        // Fix timezone issue by using local date
                        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                        setDateFromFilter(localDate.toISOString().split('T')[0]);
                      } else {
                        setDateFromFilter('');
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <span className="text-muted-foreground text-sm">to</span>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[130px] justify-start text-left"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateToFilter ? (
                      new Date(dateToFilter + 'T00:00:00').toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                    ) : (
                      <span className="text-muted-foreground">To Date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateToFilter ? new Date(dateToFilter + 'T00:00:00') : undefined}
                    onSelect={(date: Date | undefined) => {
                      if (date) {
                        // Fix timezone issue by using local date
                        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                        setDateToFilter(localDate.toISOString().split('T')[0]);
                      } else {
                        setDateToFilter('');
                      }
                    }}
                    disabled={(date: Date) =>
                      dateFromFilter ? date < new Date(dateFromFilter + 'T00:00:00') : false
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] flex-shrink-0">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] flex-shrink-0">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryOptions.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
              <SelectTrigger className="w-[180px] flex-shrink-0">
                <SelectValue placeholder="Filter by sales member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sales Members</SelectItem>
                {salesMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showUnassigned ? "default" : "outline"}
              size="sm"
              onClick={() => setShowUnassigned(!showUnassigned)}
              className="flex-shrink-0"
            >
              Show Unassigned Leads
            </Button>
            {selectedLeads.length > 0 && (
              <Button
                variant={showOnlySelected ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlySelected(!showOnlySelected)}
                className="flex-shrink-0"
              >
                Show Only Selected ({selectedLeads.length})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="flex-shrink-0"
            >
              Clear Filters
            </Button>
            {selectedLeads.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleBulkAssign}
                className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
              >
                Assign {selectedLeads.length} Lead{selectedLeads.length > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Count Overview */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm bg-[rgba(229,229,229,0.59)] p-3 rounded-[10px] border border-gray-200">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-gray-700">New: <span className="text-gray-900">{statusCounts.new}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-gray-700">Quotation sent: <span className="text-gray-900">{statusCounts.quotation_sent}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-gray-700">Interested: <span className="text-gray-900">{statusCounts.interested}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-gray-700">Not able to contact: <span className="text-gray-900">{statusCounts.not_able_to_contact}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-gray-700">Not Interested: <span className="text-gray-900">{statusCounts.not_interested}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-gray-700">Won: <span className="text-gray-900">{statusCounts.won}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-gray-700">Pending Payment: <span className="text-gray-900">{statusCounts.pending_payment}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-gray-700">Follow Up: <span className="text-gray-900">{statusCounts.follow_up}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-gray-700">Lost: <span className="text-gray-900">{statusCounts.lost}</span></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-4">
            <CardTitle className="text-xl font-bold">All Leads ({filteredLeads.length})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium whitespace-nowrap">From :</span>
                <Input
                  className="w-[70px] h-8"
                  type="number"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  placeholder="1"
                  min="1"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium whitespace-nowrap">To -</span>
                <Input
                  className="w-[70px] h-8"
                  type="number"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  placeholder={filteredLeads.length.toString()}
                  min="1"
                />
              </div>
              <Button size="sm" onClick={handleRangeSelect} className="h-8">
                Select
              </Button>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportLeads}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                      onCheckedChange={(checked: boolean) => handleSelectAllLeads(checked)}
                      aria-label="Select all leads"
                    />
                  </TableHead>
                  <TableHead className="font-bold min-w-[80px]">S.No</TableHead>
                  <TableHead className="font-bold min-w-[180px]">Company</TableHead>
                  <TableHead className="font-bold min-w-[180px]">Client Name</TableHead>
                  <TableHead className="font-bold min-w-[140px]">Designation</TableHead>
                  <TableHead className="font-bold min-w-[200px]">Requirement</TableHead>
                  <TableHead className="font-bold min-w-[180px]">Mobile No.</TableHead>
                  <TableHead className="font-bold min-w-[120px]">Category</TableHead>
                  <TableHead className="font-bold min-w-[120px]">Source</TableHead>
                  <TableHead className="font-bold min-w-[120px]">Audience</TableHead>
                  <TableHead className="font-bold min-w-[120px]">Value</TableHead>
                  <TableHead className="font-bold min-w-[120px]">Date</TableHead>
                  <TableHead className="font-bold min-w-[150px]">Status</TableHead>
                  <TableHead className="font-bold min-w-[120px]">Priority</TableHead>
                  <TableHead className="font-bold min-w-[140px]">Assigned To</TableHead>
                  <TableHead className="font-bold text-center min-w-[300px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={(checked: boolean) => handleSelectLead(lead.id, checked)}
                        aria-label={`Select lead ${lead.companyName}`}
                      />
                    </TableCell>
                    <TableCell className="min-w-[80px]">
                      <div className="font-medium text-center">
                        {baseFilteredLeads.findIndex(l => l.id === lead.id) + 1}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <div className="cursor-pointer" onClick={() => handleShowLeadDetails(lead)}>
                        <div className="font-medium hover:text-primary">{lead.companyName}</div>
                        <div className="text-sm text-muted-foreground">{lead.industry || ''}</div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <div className="font-medium cursor-pointer hover:text-primary" onClick={() => handleShowLeadDetails(lead)}>
                        {lead.contactName}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <div className="text-sm">
                        {lead.designation || ''}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      <div className="text-sm max-w-32 truncate" title={lead.requirement || ''}>
                        {lead.requirement || ''}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Mail className="h-3 w-3 mr-1" />
                          {lead.email}
                        </div>
                        {lead.phone && (
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-1" />
                            {lead.phone}
                          </div>
                        )}
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
                      <div className="flex items-center whitespace-nowrap">
                        <span className="mr-1">₹</span>
                        {lead.value.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="text-sm whitespace-nowrap">
                        {new Date(lead.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[150px]">
                      <Badge variant="secondary" className="capitalize whitespace-nowrap">
                        {lead.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <Badge variant="outline" className={getPriorityColor(lead.priority)}>
                        {lead.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      {lead.assignedToName ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{lead.assignedToName}</span>
                        </div>
                      ) : (
                        <Badge variant="outline">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[300px]">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShowHistory(lead)}
                          className="h-8 w-8 p-0"
                        >
                          <Clipboard className="h-4 w-4" />
                        </Button>
                        <Select
                          value={lead.assignedTo || ''}
                          onValueChange={(value: string) => handleAssignLead(lead.id, value)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            {salesMembers.map(member => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={lead.status}
                          onValueChange={(value: Lead['status']) => handleStatusChange(lead.id, value)}
                        >
                          <SelectTrigger className="w-[120px]">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLead(lead.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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

      {/* Bulk Assignment Dialog */}
      <Dialog open={isBulkAssignDialogOpen} onOpenChange={setIsBulkAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Leads to Sales Member</DialogTitle>
            <DialogDescription>
              Select a sales member to assign {selectedLeads.length} selected lead(s).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignTo" className="text-right">
                Assign to
              </Label>
              <Select value={bulkAssignMember} onValueChange={setBulkAssignMember}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select sales member" />
                </SelectTrigger>
                <SelectContent>
                  {salesMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleBulkAssignConfirm}
              disabled={!bulkAssignMember}
            >
              Assign Leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lead History - {selectedLeadHistory?.companyName}</DialogTitle>
            <DialogDescription>
              Track all status and assignment changes for this lead
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[500px] pr-4">
            <div className="space-y-4 py-4">
              {selectedLeadHistory?.history && selectedLeadHistory.history.length > 0 ? (
                selectedLeadHistory.history.slice().reverse().map((entry, index) => (
                  <div key={index} className="border-l-2 border-primary pl-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {entry.type === 'status_change' ? '📊 Status Change' : '👤 Assignment Change'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {entry.details}
                        </p>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {formatTimestamp(entry.timestamp)}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No history available for this lead
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Details Dialog */}
      <Dialog open={isLeadDetailsDialogOpen} onOpenChange={setIsLeadDetailsDialogOpen}>
        <DialogContent className="max-w-[1400px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedLeadDetails?.companyName}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Complete lead information and activity history
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-6 px-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Lead Information, Status, Priority, Requirement, Notes */}
              <div className="space-y-6">
                {/* Lead Information Section */}
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <UserIcon className="h-5 w-5" />
                    Lead Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Contact Name</Label>
                      <p className="text-sm font-medium">{selectedLeadDetails?.contactName}</p>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Industry</Label>
                      <p className="text-sm font-medium">{selectedLeadDetails?.industry || 'N/A'}</p>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Designation</Label>
                      <p className="text-sm font-medium">{selectedLeadDetails?.designation || 'N/A'}</p>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Category</Label>
                      <p className="text-sm font-medium break-words">{selectedLeadDetails?.category || 'N/A'}</p>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                      <p className="text-sm font-medium break-all">{selectedLeadDetails?.email || 'N/A'}</p>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Source</Label>
                      <p className="text-sm font-medium capitalize">{selectedLeadDetails?.source || 'N/A'}</p>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Phone</Label>
                      <p className="text-sm font-medium">{selectedLeadDetails?.phone || 'N/A'}</p>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Audience</Label>
                      <p className="text-sm font-medium">{selectedLeadDetails?.audience || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Status, Priority, and Expected Value Section */}
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
                      <Badge variant="secondary" className="capitalize text-xs font-medium w-fit">
                        {selectedLeadDetails?.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Priority</Label>
                      <Badge
                        variant="outline"
                        className={`${getPriorityColor(selectedLeadDetails?.priority || 'medium')} text-xs font-medium w-fit`}
                      >
                        {selectedLeadDetails?.priority}
                      </Badge>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Expected Value</Label>
                      <p className="text-sm font-bold">
                        ₹ {selectedLeadDetails?.value.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Requirement Section */}
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
                    <FileText className="h-3.5 w-3.5" />
                    Requirement
                  </Label>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {selectedLeadDetails?.requirement || 'No requirement specified'}
                  </p>
                </div>

                {/* Notes Section */}
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
                    <FileText className="h-3.5 w-3.5" />
                    Notes
                  </Label>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {selectedLeadDetails?.notes || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Right Column - Timeline, Assigned Sales Member, Activity History, Call History */}
              <div className="space-y-6">
                {/* Timeline Section */}
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5" />
                    Timeline
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">Created</span>
                      <span className="text-sm font-semibold">
                        {selectedLeadDetails?.createdAt
                          ? new Date(selectedLeadDetails.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                          : 'N/A'}
                      </span>
                    </div>
                    {selectedLeadDetails?.lastContact && (
                      <>
                        <div className="border-t border-border/50"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">Last Contact</span>
                          <span className="text-sm font-semibold">
                            {new Date(selectedLeadDetails.lastContact).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </>
                    )}
                    {selectedLeadDetails?.nextFollowUp && (
                      <>
                        <div className="border-t border-border/50"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">Next Follow-up</span>
                          <span className="text-sm font-semibold">
                            {new Date(selectedLeadDetails.nextFollowUp).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Assigned Sales Member Section */}
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <Briefcase className="h-5 w-5" />
                    Assigned Sales Member
                  </h3>
                  {selectedLeadDetails?.assignedToName ? (
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                        <UserIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{selectedLeadDetails.assignedToName}</p>
                        <p className="text-xs text-muted-foreground">Sales Representative</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center border border-border">
                        <UserIcon className="h-6 w-6" />
                      </div>
                      <p className="text-sm">Not assigned to any sales member</p>
                    </div>
                  )}
                </div>

                {/* Activity History Section */}
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <ActivityIcon className="h-5 w-5" />
                    Activity History
                  </h3>
                  {loadingActivities ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Loading activities...
                    </div>
                  ) : leadActivities.length > 0 ? (
                    <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2">
                      {leadActivities.map((activity, index) => (
                        <div key={activity.id}>
                          {index > 0 && <div className="border-t border-border/50 mb-4"></div>}
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 text-primary">{getActivityIcon(activity.type)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="capitalize text-xs font-medium">
                                  {activity.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatTimestamp(activity.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm text-foreground/90 leading-relaxed">
                                {activity.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No activities recorded for this lead
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsLeadDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}