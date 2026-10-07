export interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  designation?: string;
  requirement?: string;
  email: string;
  phone: string;
  industry: string;
  category?: string;
  source: string;
  audience?: string;
  value: number;
  status: 'new' | 'quotation_sent' | 'interested' | 'not_able_to_contact' | 'not_interested' | 'won' | 'pending_payment' | 'follow_up' | 'lost' | 'dnp';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  lastContact?: string;
  nextFollowUp?: string;
  notes: string;
  productsOffered: string[];
  callHistory: Array<{
    date: string;
    type: 'call' | 'email' | 'whatsapp' | 'meeting' | 'note';
    notes: string;
  }>;
  history?: Array<{
    type: 'status_change' | 'assignment_change';
    timestamp: string;
    changedBy?: string;
    changedByName?: string;
    oldValue?: string;
    newValue?: string;
    details?: string;
  }>;
  finalStatus?: 'valid' | 'misleading' | 'junk';
  followUpStatus?: 'pending' | 'reminded' | 'completed' | 'overdue';
  followUpRemindedAt?: string;
  followUpCompletedAt?: string;
  followUpOverdueReason?: 'dismissed' | 'no_action' | null;
}

export interface Target {
  id: string;
  userId: string;
  type: 'weekly' | 'monthly';
  target: number;
  achieved: number;
  period: string;
}

export interface Activity {
  id: string;
  userId: string;
  leadId: string;
  type: 'call' | 'email' | 'whatsapp' | 'meeting' | 'note';
  description: string;
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'sales';
  avatar?: string;
  teamId?: string;
  phone?: string;
  password?: string;
  department?: string;
}