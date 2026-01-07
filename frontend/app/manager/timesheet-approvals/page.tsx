'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Clock, User, Calendar, Filter, Download, TrendingUp, BarChart3, ChevronLeft, ChevronRight, DollarSign, Users, Receipt, Send, Eye, ArrowUpRight, Sparkles, Timer, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, isSameDay } from 'date-fns';
import { formatLocalDate } from '@/lib/date-utils';

interface TimesheetEntry {
  id: string;
  workDate: string;
  hoursWorked: number;
  description: string;
  activityType?: string;
  isBillable: boolean;
  billingAmount?: number;
  status: string;
  submittedAt?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
  };
  project?: {
    id: string;
    name: string;
    projectCode?: string;
  };
}

interface TeamMember {
  userId: string;
  name: string;
  employeeId: string;
  pendingCount: number;
  totalHours: number;
  billableHours: number;
}

interface ApprovedEntry {
  id: string;
  workDate: string;
  hoursWorked: number;
  description: string;
  isBillable: boolean;
  billingAmount?: number;
  approvedAt?: string;
  approvedBy?: string;
  isAutoApproved: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  project?: {
    id: string;
    name: string;
    projectCode?: string;
  } | null;
}

// Pending Submission - Employees who haven't submitted timesheets (either DRAFT or no entries at all)
interface PendingSubmissionEmployee {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
  department: string;
  status: 'no_entries' | 'has_drafts';
  draftEntries: Array<{
    id: string;
    workDate: string;
    hoursWorked: number;
    isBillable: boolean;
    description: string | null;
    project: { id: string; name: string; projectCode: string | null } | null;
  }>;
  totalDraftHours: number;
  totalDraftEntries: number;
  billableHours: number;
}

interface RejectedEntry {
  id: string;
  workDate: string;
  hoursWorked: number;
  description: string;
  activityType?: string;
  isBillable: boolean;
  billingAmount?: number;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  submittedAt?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    email: string;
    department?: {
      name: string;
    };
  };
  rejector?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  project?: {
    id: string;
    name: string;
    projectCode?: string;
  } | null;
  task?: {
    id: string;
    name: string;
  } | null;
}

export default function TimesheetApprovalsPage() {
  const router = useRouter();
  const [pendingEntries, setPendingEntries] = useState<TimesheetEntry[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionCategory, setRejectionCategory] = useState<string>('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showBulkApproveConfirm, setShowBulkApproveConfirm] = useState(false);
  const [bulkApproveUserId, setBulkApproveUserId] = useState<string | null>(null);
  const [bulkApproveDate, setBulkApproveDate] = useState<Date | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
  const [bulkRejectEntryIds, setBulkRejectEntryIds] = useState<string[]>([]);
  const [bulkRejectionReason, setBulkRejectionReason] = useState('');
  const [bulkRejectionCategory, setBulkRejectionCategory] = useState<string>('');
  const [bulkRejecting, setBulkRejecting] = useState(false);

  // Send reminder state
  const [sendingReminder, setSendingReminder] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderEmployeeIds, setReminderEmployeeIds] = useState<string[]>([]);
  const [reminderMessage, setReminderMessage] = useState('');

  // Quick Filters
  const [quickFilter, setQuickFilter] = useState<string>('all');
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  // Weekly view
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [allTeamMembers, setAllTeamMembers] = useState<any[]>([]);

  // Tab state for the timesheets section (pending approval, not submitted, approved)
  const [timesheetsTab, setTimesheetsTab] = useState<'pending' | 'not-submitted' | 'approved'>('pending');

  // Bulk approve all state
  const [bulkApprovingAll, setBulkApprovingAll] = useState(false);

  // Overall stats (not filtered by week) for the stats cards
  const [overallStats, setOverallStats] = useState({
    totalPendingEntries: 0,
    totalPendingHours: 0,
    totalBillableHours: 0,
    totalApprovedHours: 0,
    totalRejectedCount: 0,
    totalExpenses: { total: 0, count: 0 },
  });

  // Inline bulk approve state
  const [inlineBulkApprovingId, setInlineBulkApprovingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingApprovals();
    fetchAllTeamMembers();
  }, [selectedMember, currentWeekStart]);

  // Fetch overall stats (not filtered by week) for stats cards
  useEffect(() => {
    fetchOverallStats();
  }, []);

  const fetchAllTeamMembers = async () => {
    try {
      // Fetch all team members to show who hasn't submitted
      const response = await fetch('/api/manager/team');
      const data = await response.json();

      if (data.success) {
        setAllTeamMembers(data.members || []);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  // Fetch overall stats (all-time, not filtered by week) for stats cards
  const fetchOverallStats = async () => {
    try {
      // Fetch all data in parallel without date filters
      const [pendingRes, approvedRes, rejectedRes, expensesRes] = await Promise.all([
        fetch('/api/manager/timesheets/pending'),
        fetch('/api/manager/timesheets/approved'),
        fetch('/api/manager/timesheets/rejected'),
        fetch('/api/manager/expenses/pending'),
      ]);

      const [pendingData, approvedData, rejectedData, expensesData] = await Promise.all([
        pendingRes.json(),
        approvedRes.json(),
        rejectedRes.json(),
        expensesRes.json(),
      ]);

      const pendingEntriesAll = pendingData.success ? (pendingData.entries || []) : [];
      const approvedEntriesAll = approvedData.success ? (approvedData.entries || []) : [];
      const rejectedEntriesAll = rejectedData.success ? (rejectedData.entries || []) : [];
      const pendingExpenses = expensesData.success
        ? (expensesData.expenses || []).filter((e: any) => e.status === 'SUBMITTED')
        : [];

      setOverallStats({
        totalPendingEntries: pendingEntriesAll.length,
        totalPendingHours: pendingEntriesAll.reduce((sum: number, e: any) => sum + e.hoursWorked, 0),
        totalBillableHours: pendingEntriesAll.filter((e: any) => e.isBillable).reduce((sum: number, e: any) => sum + e.hoursWorked, 0),
        totalApprovedHours: approvedEntriesAll.reduce((sum: number, e: any) => sum + e.hoursWorked, 0),
        totalRejectedCount: rejectedEntriesAll.length,
        totalExpenses: {
          total: pendingExpenses.reduce((sum: number, e: any) => sum + e.amount, 0),
          count: pendingExpenses.length,
        },
      });
    } catch (error) {
      console.error('Failed to fetch overall stats:', error);
    }
  };

  // Handle bulk approve all pending entries
  const handleBulkApproveAll = async () => {
    if (pendingEntries.length === 0) return;

    setBulkApprovingAll(true);
    const loadingToast = toast.loading(`Approving all ${pendingEntries.length} entries...`);

    try {
      const response = await fetch('/api/manager/timesheets/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds: pendingEntries.map(e => e.id) }),
      });

      const data = await response.json();
      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(`Successfully approved ${data.approvedCount || pendingEntries.length} entries`);
        // Refresh data
        await Promise.all([
          fetchPendingApprovals(),
          fetchApprovedHours(),
          fetchOverallStats(),
        ]);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to approve all entries');
    } finally {
      setBulkApprovingAll(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'a' && selectedEntries.size > 0) {
        e.preventDefault();
        handleBulkApproveSelected();
      } else if (e.key === 'r' && selectedEntries.size === 1) {
        e.preventDefault();
        const entryId = Array.from(selectedEntries)[0];
        const entry = pendingEntries.find(e => e.id === entryId);
        if (entry) {
          setSelectedEntry(entry);
          setShowRejectDialog(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedEntries, pendingEntries]);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const url = selectedMember === 'all'
        ? '/api/manager/timesheets/pending'
        : `/api/manager/timesheets/pending?userId=${selectedMember}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setPendingEntries(data.entries || []);
        setTeamMembers(data.teamSummary || []);
      }
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (entryId: string) => {
    setApprovingId(entryId);

    // Optimistic update - remove entry from pending list immediately
    const entryToApprove = pendingEntries.find(e => e.id === entryId);
    const previousEntries = [...pendingEntries];
    setPendingEntries(prev => prev.filter(e => e.id !== entryId));

    // Optimistic update - add to approved entries
    if (entryToApprove) {
      const approvedEntry: ApprovedEntry = {
        id: entryToApprove.id,
        workDate: entryToApprove.workDate,
        hoursWorked: entryToApprove.hoursWorked,
        description: entryToApprove.description,
        isBillable: entryToApprove.isBillable,
        billingAmount: entryToApprove.billingAmount,
        approvedAt: new Date().toISOString(),
        isAutoApproved: false, // Manager approved
        user: entryToApprove.user,
        project: entryToApprove.project,
        approver: null, // Will be updated on refresh
      };
      setApprovedEntries(prev => [...prev, approvedEntry]);
      setApprovedHours(prev => prev + entryToApprove.hoursWorked);
    }

    try {
      const response = await fetch(`/api/manager/timesheets/${entryId}/approve`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Timesheet entry approved');
        // Refresh data in background to ensure consistency
        Promise.all([fetchPendingApprovals(), fetchApprovedHours()]);
      } else {
        // Revert optimistic update on error
        setPendingEntries(previousEntries);
        if (entryToApprove) {
          setApprovedEntries(prev => prev.filter(e => e.id !== entryId));
          setApprovedHours(prev => prev - entryToApprove.hoursWorked);
        }
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to approve entry:', error);
      toast.error(error.message || 'Failed to approve entry');
      // Revert optimistic update on error
      setPendingEntries(previousEntries);
      if (entryToApprove) {
        setApprovedEntries(prev => prev.filter(e => e.id !== entryId));
        setApprovedHours(prev => prev - entryToApprove.hoursWorked);
      }
    } finally {
      setApprovingId(null);
    }
  };

  const handleBulkApprove = (userId: string, date?: Date) => {
    let userEntries = pendingEntries.filter((e) => e.user.id === userId);

    // If date is provided, filter by that specific date
    if (date) {
      const dateStr = formatLocalDate(date);
      userEntries = userEntries.filter((e) => e.workDate === dateStr);
    }

    if (userEntries.length === 0) return;

    setBulkApproveUserId(userId);
    setBulkApproveDate(date || null);
    setShowBulkApproveConfirm(true);
  };

  const handleConfirmBulkApprove = async () => {
    if (!bulkApproveUserId) return;

    let userEntries = pendingEntries.filter((e) => e.user.id === bulkApproveUserId);

    // If date is provided, filter by that specific date
    if (bulkApproveDate) {
      const dateStr = formatLocalDate(bulkApproveDate);
      userEntries = userEntries.filter((e) => e.workDate === dateStr);
    }

    setShowBulkApproveConfirm(false);

    // Optimistic update - remove entries from pending list immediately
    const previousEntries = [...pendingEntries];
    const previousApproved = [...approvedEntries];
    const previousHours = approvedHours;
    const entryIds = userEntries.map((e) => e.id);
    const totalHours = userEntries.reduce((sum, e) => sum + e.hoursWorked, 0);

    setPendingEntries(prev => prev.filter(e => !entryIds.includes(e.id)));
    const approvedUserEntries: ApprovedEntry[] = userEntries.map(e => ({
      id: e.id,
      workDate: e.workDate,
      hoursWorked: e.hoursWorked,
      description: e.description,
      isBillable: e.isBillable,
      billingAmount: e.billingAmount,
      approvedAt: new Date().toISOString(),
      isAutoApproved: false, // Manager approved
      user: e.user,
      project: e.project,
      approver: null, // Will be updated on refresh
    }));
    setApprovedEntries(prev => [...prev, ...approvedUserEntries]);
    setApprovedHours(prev => prev + totalHours);

    // Close the employee modal for this user if they were selected
    if (selectedEmployeeId === bulkApproveUserId) {
      setSelectedEmployeeId(null);
    }

    try {
      const response = await fetch('/api/manager/timesheets/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${entryIds.length} entries approved`);
        // Refresh data in background to ensure consistency
        Promise.all([fetchPendingApprovals(), fetchApprovedHours()]);
      } else {
        // Revert optimistic update
        setPendingEntries(previousEntries);
        setApprovedEntries(previousApproved);
        setApprovedHours(previousHours);
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to bulk approve:', error);
      toast.error(error.message || 'Failed to bulk approve');
      // Revert optimistic update
      setPendingEntries(previousEntries);
      setApprovedEntries(previousApproved);
      setApprovedHours(previousHours);
    } finally {
      setBulkApproveUserId(null);
      setBulkApproveDate(null);
    }
  };

  const handleReject = async () => {
    if (!selectedEntry) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setRejectingId(selectedEntry.id);

    try {
      const response = await fetch(`/api/manager/timesheets/${selectedEntry.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: rejectionReason,
          category: rejectionCategory || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Timesheet entry rejected');
        setShowRejectDialog(false);
        setSelectedEntry(null);
        setRejectionReason('');
        setRejectionCategory('');
        // Refresh data immediately
        await fetchPendingApprovals();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to reject entry:', error);
      toast.error(error.message || 'Failed to reject entry');
    } finally {
      setRejectingId(null);
    }
  };

  const openBulkRejectDialog = (entryIds: string[]) => {
    if (entryIds.length === 0) {
      toast.error('No entries selected for rejection');
      return;
    }
    setBulkRejectEntryIds(entryIds);
    setBulkRejectionReason('');
    setShowBulkRejectDialog(true);
  };

  const handleBulkReject = async () => {
    if (!bulkRejectionReason.trim() || bulkRejectionReason.trim().length < 10) {
      toast.error('Please provide a reason for rejection (at least 10 characters)');
      return;
    }

    setBulkRejecting(true);
    const loadingToast = toast.loading('Rejecting entries...', {
      description: `Rejecting ${bulkRejectEntryIds.length} entries`,
    });

    try {
      const response = await fetch('/api/manager/timesheets/bulk-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryIds: bulkRejectEntryIds,
          reason: bulkRejectionReason.trim(),
          category: bulkRejectionCategory || undefined,
        }),
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(`${data.rejectedCount} entries rejected`, {
          description: 'Employees have been notified',
        });
        setShowBulkRejectDialog(false);
        setBulkRejectEntryIds([]);
        setBulkRejectionReason('');
        setSelectedEntries(new Set());
        await Promise.all([fetchPendingApprovals(), fetchApprovedHours()]);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to bulk reject:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to reject entries');
    } finally {
      setBulkRejecting(false);
    }
  };

  const openReminderDialog = (employeeUserIds: string[]) => {
    if (employeeUserIds.length === 0) {
      toast.error('No employees to remind');
      return;
    }
    setReminderEmployeeIds(employeeUserIds);
    setReminderMessage('');
    setShowReminderDialog(true);
  };

  const handleSendReminder = async () => {
    if (reminderEmployeeIds.length === 0) return;

    setSendingReminder(true);
    const loadingToast = toast.loading('Sending reminders...', {
      description: `Sending to ${reminderEmployeeIds.length} employee(s)`,
    });

    try {
      const response = await fetch('/api/manager/timesheets/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeIds: reminderEmployeeIds,
          weekStart: formatLocalDate(currentWeekStart),
          weekEnd: formatLocalDate(weekEnd),
          message: reminderMessage.trim() || undefined,
        }),
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(`Reminders sent to ${data.sentCount} employee(s)`, {
          description: data.failedCount > 0 ? `${data.failedCount} failed` : undefined,
        });
        setShowReminderDialog(false);
        setReminderEmployeeIds([]);
        setReminderMessage('');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to send reminders:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to send reminders');
    } finally {
      setSendingReminder(false);
    }
  };

  const handleExportCSV = () => {
    if (pendingEntries.length === 0) {
      toast.error('No entries to export');
      return;
    }

    // Prepare CSV data
    const headers = [
      'Employee Name',
      'Employee ID',
      'Email',
      'Work Date',
      'Hours',
      'Billable',
      'Project',
      'Description',
      'Activity Type',
      'Status',
      'Submitted At',
    ];

    const rows = pendingEntries.map((entry) => [
      `${entry.user.firstName} ${entry.user.lastName}`,
      entry.user.employeeId,
      entry.user.email,
      entry.workDate, // Already a string "YYYY-MM-DD" from API
      entry.hoursWorked.toString(),
      entry.isBillable ? 'Yes' : 'No',
      entry.project?.name || 'N/A',
      `"${entry.description.replace(/"/g, '""')}"`, // Escape quotes
      entry.activityType || 'N/A',
      entry.status,
      entry.submittedAt ? format(new Date(entry.submittedAt), 'yyyy-MM-dd HH:mm') : 'N/A',
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `timesheet-approvals-${formatLocalDate(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${pendingEntries.length} entries to CSV`);
  };

  const handleBulkApproveSelected = async () => {
    if (selectedEntries.size === 0) return;

    try {
      const entryIds = Array.from(selectedEntries);

      const response = await fetch('/api/manager/timesheets/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${entryIds.length} entries approved`);
        setSelectedEntries(new Set());
        fetchPendingApprovals();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to bulk approve:', error);
      toast.error(error.message || 'Failed to bulk approve');
    }
  };

  const toggleEntrySelection = (entryId: string) => {
    const newSelection = new Set(selectedEntries);
    if (newSelection.has(entryId)) {
      newSelection.delete(entryId);
    } else {
      newSelection.add(entryId);
    }
    setSelectedEntries(newSelection);
  };

  // Apply quick filters
  const getFilteredEntries = () => {
    let filtered = pendingEntries;

    switch (quickFilter) {
      case 'overtime':
        filtered = filtered.filter((e) => e.hoursWorked > 8);
        break;
      case 'weekend':
        filtered = filtered.filter((e) => {
          const date = new Date(e.workDate);
          const day = date.getDay();
          return day === 0 || day === 6; // Sunday or Saturday
        });
        break;
      case 'late':
        filtered = filtered.filter((e) => {
          if (!e.submittedAt) return false;
          const workDate = new Date(e.workDate);
          const submittedDate = new Date(e.submittedAt);
          const diffDays = Math.floor((submittedDate.getTime() - workDate.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays > 3; // Submitted more than 3 days after work date
        });
        break;
      case 'highValue':
        filtered = filtered.filter((e) => e.isBillable && e.hoursWorked >= 4);
        break;
      default:
        break;
    }

    return filtered;
  };

  const filteredEntries = getFilteredEntries();

  const [approvedHours, setApprovedHours] = useState(0);
  const [approvedEntries, setApprovedEntries] = useState<ApprovedEntry[]>([]);
  const [rejectedEntries, setRejectedEntries] = useState<RejectedEntry[]>([]);
  const [weeklyExpenses, setWeeklyExpenses] = useState({ total: 0, count: 0 });
  const [selectedApprovedEmployee, setSelectedApprovedEmployee] = useState<string | null>(null);
  const [selectedRejectedEmployee, setSelectedRejectedEmployee] = useState<string | null>(null);

  // Pending submission state (employees who haven't submitted)
  const [pendingSubmissionEmployees, setPendingSubmissionEmployees] = useState<PendingSubmissionEmployee[]>([]);
  const [loadingPendingSubmission, setLoadingPendingSubmission] = useState(false);

  // Fetch approved hours, rejected entries, weekly expenses, and pending submissions for current week
  useEffect(() => {
    fetchApprovedHours();
    fetchRejectedEntries();
    fetchWeeklyExpenses();
    fetchPendingSubmissions();
  }, [currentWeekStart]);

  const fetchApprovedHours = async () => {
    try {
      const startDate = formatLocalDate(currentWeekStart);
      const endDate = formatLocalDate(weekEnd);

      const response = await fetch(`/api/manager/timesheets/approved?startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();

      if (data.success) {
        const entries = data.entries || [];
        setApprovedEntries(entries);
        const total = entries.reduce((sum: number, e: any) => sum + e.hoursWorked, 0) || 0;
        setApprovedHours(total);
      }
    } catch (error) {
      console.error('Failed to fetch approved hours:', error);
    }
  };

  const fetchRejectedEntries = async () => {
    try {
      const startDate = formatLocalDate(currentWeekStart);
      const endDate = formatLocalDate(weekEnd);

      const response = await fetch(`/api/manager/timesheets/rejected?startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();

      if (data.success) {
        setRejectedEntries(data.entries || []);
      }
    } catch (error) {
      console.error('Failed to fetch rejected entries:', error);
    }
  };

  const fetchWeeklyExpenses = async () => {
    try {
      const startDate = formatLocalDate(currentWeekStart);
      const endDate = formatLocalDate(weekEnd);

      const response = await fetch(`/api/manager/expenses/pending?startDate=${startDate}&endDate=${endDate}&dateFilter=submittedAt`);
      const data = await response.json();

      if (data.success) {
        // Filter only SUBMITTED expenses (pending approval)
        const pendingExpenses = (data.expenses || []).filter((e: any) => e.status === 'SUBMITTED');
        const total = pendingExpenses.reduce((sum: number, e: any) => sum + e.amount, 0) || 0;
        setWeeklyExpenses({ total, count: pendingExpenses.length });
      }
    } catch (error) {
      console.error('Failed to fetch weekly expenses:', error);
    }
  };

  const fetchPendingSubmissions = async () => {
    try {
      setLoadingPendingSubmission(true);
      const startDate = formatLocalDate(currentWeekStart);
      const endDate = formatLocalDate(weekEnd);

      const response = await fetch(`/api/manager/timesheets/pending-submission?startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();

      if (data.success) {
        setPendingSubmissionEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Failed to fetch pending submissions:', error);
    } finally {
      setLoadingPendingSubmission(false);
    }
  };

  const stats = {
    totalPending: pendingEntries.length,
    totalHours: pendingEntries.reduce((sum, e) => sum + e.hoursWorked, 0),
    billableHours: pendingEntries.filter((e) => e.isBillable).reduce((sum, e) => sum + e.hoursWorked, 0),
    approvedHours: approvedHours,
    rejectedCount: rejectedEntries.length,
    rejectedHours: rejectedEntries.reduce((sum, e) => sum + e.hoursWorked, 0),
    teamMembers: new Set(pendingEntries.map((e) => e.user.id)).size,
  };

  // Calculate weekly trend (last 7 days)
  const getWeeklyTrend = () => {
    const dayMap = new Map<string, number>();
    const today = new Date();

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = formatLocalDate(date);
      dayMap.set(dateStr, 0);
    }

    // Aggregate hours by day
    pendingEntries.forEach((entry) => {
      const dateStr = entry.workDate; // Already a string "YYYY-MM-DD"
      if (dayMap.has(dateStr)) {
        dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + entry.hoursWorked);
      }
    });

    return Array.from(dayMap.entries()).map(([date, hours]) => ({
      date,
      hours,
      label: format(new Date(date), 'EEE'),
    }));
  };

  const weeklyTrend = getWeeklyTrend();
  const maxHours = Math.max(...weeklyTrend.map(d => d.hours), 1);

  // Weekly calendar helpers
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Group approved entries by employee
  const getApprovedEntriesByEmployee = () => {
    const employeeMap = new Map<string, {
      userId: string;
      name: string;
      employeeId: string;
      entries: ApprovedEntry[];
      totalHours: number;
      autoApprovedCount: number;
      managerApprovedCount: number;
    }>();

    approvedEntries.forEach(entry => {
      const userId = entry.user.id;
      if (!employeeMap.has(userId)) {
        employeeMap.set(userId, {
          userId,
          name: `${entry.user.firstName} ${entry.user.lastName}`,
          employeeId: entry.user.employeeId,
          entries: [],
          totalHours: 0,
          autoApprovedCount: 0,
          managerApprovedCount: 0,
        });
      }
      const employee = employeeMap.get(userId)!;
      employee.entries.push(entry);
      employee.totalHours += entry.hoursWorked;
      if (entry.isAutoApproved) {
        employee.autoApprovedCount++;
      } else {
        employee.managerApprovedCount++;
      }
    });

    return Array.from(employeeMap.values()).sort((a, b) => b.totalHours - a.totalHours);
  };

  const approvedByEmployee = getApprovedEntriesByEmployee();

  // Group rejected entries by employee
  const getRejectedEntriesByEmployee = () => {
    const employeeMap = new Map<string, {
      userId: string;
      name: string;
      employeeId: string;
      email: string;
      department?: string;
      entries: RejectedEntry[];
      totalHours: number;
    }>();

    rejectedEntries.forEach(entry => {
      const userId = entry.user.id;
      if (!employeeMap.has(userId)) {
        employeeMap.set(userId, {
          userId,
          name: `${entry.user.firstName} ${entry.user.lastName}`,
          employeeId: entry.user.employeeId,
          email: entry.user.email,
          department: entry.user.department?.name,
          entries: [],
          totalHours: 0,
        });
      }
      const employee = employeeMap.get(userId)!;
      employee.entries.push(entry);
      employee.totalHours += entry.hoursWorked;
    });

    return Array.from(employeeMap.values()).sort((a, b) => b.totalHours - a.totalHours);
  };

  const rejectedByEmployee = getRejectedEntriesByEmployee();

  // Group pending entries by employee with date ranges
  const getPendingEntriesByEmployee = () => {
    const employeeMap = new Map<string, {
      userId: string;
      name: string;
      employeeId: string;
      email: string;
      entries: TimesheetEntry[];
      totalHours: number;
      billableHours: number;
      dateRange: { earliest: Date; latest: Date };
    }>();

    pendingEntries.forEach(entry => {
      const userId = entry.user.id;
      const entryDate = new Date(entry.workDate);

      if (!employeeMap.has(userId)) {
        employeeMap.set(userId, {
          userId,
          name: `${entry.user.firstName} ${entry.user.lastName}`,
          employeeId: entry.user.employeeId,
          email: entry.user.email,
          entries: [],
          totalHours: 0,
          billableHours: 0,
          dateRange: { earliest: entryDate, latest: entryDate },
        });
      }
      const employee = employeeMap.get(userId)!;
      employee.entries.push(entry);
      employee.totalHours += entry.hoursWorked;
      if (entry.isBillable) {
        employee.billableHours += entry.hoursWorked;
      }
      // Update date range
      if (entryDate < employee.dateRange.earliest) {
        employee.dateRange.earliest = entryDate;
      }
      if (entryDate > employee.dateRange.latest) {
        employee.dateRange.latest = entryDate;
      }
    });

    return Array.from(employeeMap.values()).sort((a, b) => b.totalHours - a.totalHours);
  };

  const pendingByEmployee = getPendingEntriesByEmployee();
  const [selectedPendingEmployee, setSelectedPendingEmployee] = useState<string | null>(null);

  const getEmployeesForDay = (day: Date) => {
    const dateStr = formatLocalDate(day);

    // Get pending (submitted but not approved)
    const pending = pendingEntries
      .filter(e => e.workDate === dateStr)
      .map(e => e.user.id);

    // Get approved
    const approved = approvedEntries
      .filter(e => e.workDate === dateStr)
      .map(e => e.user.id);

    // Combine both (employees who submitted = pending OR approved)
    const allSubmitted = Array.from(new Set([...pending, ...approved]));
    const uniqueApproved = Array.from(new Set(approved));
    const uniquePending = Array.from(new Set(pending));

    return {
      submitted: allSubmitted.length,
      approved: uniqueApproved.length,
      pending: uniquePending.length,
      total: allTeamMembers.length,
      submittedEmployees: allSubmitted,
    };
  };

  const getDayEntries = (day: Date, userId?: string) => {
    const dateStr = formatLocalDate(day);
    return pendingEntries.filter(e => {
      const matchesDate = e.workDate === dateStr;
      const matchesUser = !userId || e.user.id === userId;
      return matchesDate && matchesUser;
    });
  };

  const getSubmittedEmployeesForDay = (day: Date) => {
    const dateStr = formatLocalDate(day);
    const employeeMap = new Map();

    pendingEntries.forEach(entry => {
      if (entry.workDate === dateStr) {
        if (!employeeMap.has(entry.user.id)) {
          employeeMap.set(entry.user.id, {
            ...entry.user,
            entries: [],
            totalHours: 0,
          });
        }
        const emp = employeeMap.get(entry.user.id);
        emp.entries.push(entry);
        emp.totalHours += entry.hoursWorked;
      }
    });

    return Array.from(employeeMap.values());
  };

  const getPendingEmployeesForDay = (day: Date) => {
    const submittedIds = getSubmittedEmployeesForDay(day).map(e => e.id);
    return allTeamMembers.filter(member => !submittedIds.includes(member.id)).map(member => ({
      userId: member.id,
      name: `${member.firstName} ${member.lastName}`,
      employeeId: member.employeeId,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-100/40 to-teal-100/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-violet-100/30 to-purple-100/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 w-72 h-72 bg-gradient-to-br from-amber-100/30 to-orange-100/30 rounded-full blur-3xl" />
      </div>

      <div className="relative p-8 max-w-[1600px] mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-violet-600 shadow-lg shadow-primary/25">
                <Timer className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-800 bg-clip-text text-transparent tracking-tight">
                  Timesheet Approvals
                </h1>
                <p className="text-slate-500 mt-1 text-lg">Review and approve team time entries</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {pendingEntries.length > 0 && (
              <Button
                onClick={handleBulkApproveAll}
                disabled={bulkApprovingAll}
                className="h-12 px-6 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-0.5"
              >
                {bulkApprovingAll ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Approve All ({pendingEntries.length})
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={pendingEntries.length === 0}
              className="h-12 px-5 rounded-xl border-2 border-slate-200 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={() => { fetchPendingApprovals(); fetchOverallStats(); }}
              className="h-12 w-12 p-0 rounded-xl border-2 border-slate-200 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
          {/* Pending Approvals Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-200/30 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <Badge className="bg-amber-100 text-amber-700 border-0 font-medium">Pending</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-bold text-slate-900">{overallStats.totalPendingEntries}</p>
                <p className="text-sm text-slate-500 font-medium">Entries awaiting review</p>
              </div>
            </div>
          </div>

          {/* Pending Hours Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-violet-100">
                  <Timer className="h-5 w-5 text-primary" />
                </div>
                <div className="flex items-center gap-1 text-primary">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-semibold">Hours</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-bold text-slate-900">{overallStats.totalPendingHours.toFixed(1)}<span className="text-2xl text-slate-400">h</span></p>
                <p className="text-sm text-slate-500 font-medium">Total pending hours</p>
              </div>
            </div>
          </div>

          {/* Approved Hours Card */}
          <div
            className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-200/30 hover:-translate-y-1 cursor-pointer"
            onClick={() => {
              setTimesheetsTab('approved');
              const section = document.getElementById('timesheets-section');
              section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <ArrowUpRight className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-0 font-medium">Approved</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-bold text-slate-900">{overallStats.totalApprovedHours.toFixed(1)}<span className="text-2xl text-slate-400">h</span></p>
                <p className="text-sm text-slate-500 font-medium">Total approved</p>
              </div>
            </div>
          </div>

          {/* Rejected Timesheets Card */}
          <div
            className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-red-200/30 hover:-translate-y-1 cursor-pointer"
            onClick={() => {
              const section = document.getElementById('rejected-timesheets-section');
              section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <ArrowUpRight className="h-5 w-5 text-red-500" />
            </div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-100 to-rose-100">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <Badge className="bg-red-100 text-red-700 border-0 font-medium">Rejected</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-bold text-slate-900">{overallStats.totalRejectedCount}</p>
                <p className="text-sm text-slate-500 font-medium">Total rejected</p>
              </div>
            </div>
          </div>

          {/* Billable Hours Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-200/30 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <Badge className="bg-blue-100 text-blue-700 border-0 font-medium">Billable</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-bold text-slate-900">{overallStats.totalBillableHours.toFixed(1)}<span className="text-2xl text-slate-400">h</span></p>
                <p className="text-sm text-slate-500 font-medium">
                  {overallStats.totalPendingHours > 0 ? ((overallStats.totalBillableHours / overallStats.totalPendingHours) * 100).toFixed(0) : 0}% billable
                </p>
              </div>
            </div>
          </div>

          {/* Weekly Expenses Card */}
          <div
            className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-rose-200/30 hover:-translate-y-1 cursor-pointer"
            onClick={() => router.push('/manager/expenses')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <ArrowUpRight className="h-5 w-5 text-rose-500" />
            </div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100">
                  <Receipt className="h-5 w-5 text-rose-600" />
                </div>
                <Badge className="bg-rose-100 text-rose-700 border-0 font-medium">Expenses</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-bold text-slate-900">${overallStats.totalExpenses.total.toFixed(0)}</p>
                <p className="text-sm text-slate-500 font-medium">{overallStats.totalExpenses.count} pending</p>
              </div>
            </div>
          </div>
        </div>

      {/* Pending Approvals by Employee Section */}
      {pendingByEmployee.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Pending Approvals by Employee
            </CardTitle>
            <CardDescription className="mt-1">
              {pendingByEmployee.length} employee{pendingByEmployee.length !== 1 ? 's' : ''} with pending timesheets • {pendingEntries.length} entries total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingByEmployee.map((employee) => (
                <div
                  key={employee.userId}
                  className="border border-orange-200 rounded-lg overflow-hidden bg-orange-50"
                >
                  {/* Employee Header */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-orange-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-orange-700" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{employee.name}</div>
                          <div className="text-xs text-slate-600">{employee.employeeId}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-orange-600">{employee.totalHours.toFixed(1)}h</div>
                          <div className="text-xs text-slate-500">{employee.entries.length} entries</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-600">
                            {format(employee.dateRange.earliest, 'MMM d')}
                            {employee.dateRange.earliest.getTime() !== employee.dateRange.latest.getTime() && (
                              <> - {format(employee.dateRange.latest, 'MMM d')}</>
                            )}
                          </div>
                          {employee.billableHours > 0 && (
                            <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 mt-0.5">
                              {employee.billableHours.toFixed(1)}h billable
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Navigate calendar to the employee's date range
                            setCurrentWeekStart(startOfWeek(employee.dateRange.earliest, { weekStartsOn: 1 }));
                            // Open the day modal for the earliest date
                            setSelectedDay(employee.dateRange.earliest);
                            setShowEmployeeModal(true);
                          }}
                          className="h-8"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Calendar View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                Weekly Submission Status
              </CardTitle>
              <CardDescription className="mt-1 flex items-center gap-4">
                <span>{format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}</span>
                {allTeamMembers.length > 0 && (() => {
                  const weekApproved = new Set(approvedEntries.map(e => e.user.id)).size;
                  const weekPending = teamMembers.length;
                  const weekNotSubmitted = allTeamMembers.length - weekApproved - weekPending;

                  return (
                    <>
                      <span className="text-slate-400">•</span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <strong>{allTeamMembers.length}</strong> team members
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                        <strong>{weekApproved}</strong> approved
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-orange-600" />
                        <strong>{weekPending}</strong> pending approval
                      </span>
                      {weekNotSubmitted > 0 && (
                        <>
                          <span className="text-slate-400">•</span>
                          <span className="flex items-center gap-1.5">
                            <XCircle className="h-3.5 w-3.5 text-slate-400" />
                            <strong>{weekNotSubmitted}</strong> not submitted
                          </span>
                        </>
                      )}
                    </>
                  );
                })()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            // Loading Skeleton for Calendar
            <div className="grid grid-cols-7 gap-3">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-4">
                  {/* Day Header Skeleton */}
                  <div className="text-center mb-3">
                    <div className="h-3 bg-slate-200 rounded animate-pulse w-8 mx-auto mb-2"></div>
                    <div className="h-8 bg-slate-200 rounded animate-pulse w-10 mx-auto"></div>
                  </div>

                  {/* Stats Skeleton */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-3 bg-slate-200 rounded animate-pulse w-16"></div>
                      <div className="h-5 bg-slate-200 rounded-full animate-pulse w-10"></div>
                    </div>

                    {/* Progress Bar Skeleton */}
                    <div className="h-2 bg-slate-200 rounded-full animate-pulse"></div>

                    {/* Bottom Stats Skeleton */}
                    <div className="flex items-center justify-between">
                      <div className="h-3 bg-slate-200 rounded animate-pulse w-6"></div>
                      <div className="h-3 bg-slate-200 rounded animate-pulse w-12"></div>
                      <div className="h-3 bg-slate-200 rounded animate-pulse w-6"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-3">
              {weekDays.map((day) => {
                const dayStats = getEmployeesForDay(day);
                const isToday = isSameDay(day, new Date());
                const submissionRate = dayStats.total > 0 ? (dayStats.submitted / dayStats.total) * 100 : 0;

                return (
                  <div
                    key={day.toISOString()}
                    className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg ${
                      isToday ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-200' : 'border-slate-200 hover:border-purple-300'
                    }`}
                    onClick={() => {
                      setSelectedDay(day);
                      setShowEmployeeModal(true);
                    }}
                  >
                    {/* Day Header */}
                    <div className={`text-center mb-3 ${isToday ? 'text-purple-600' : 'text-slate-600'}`}>
                      <div className="text-xs font-semibold uppercase">{format(day, 'EEE')}</div>
                      <div className="text-2xl font-bold">{format(day, 'd')}</div>
                    </div>

                    {/* Submission Stats */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Submitted</span>
                        <Badge className={dayStats.submitted === dayStats.total ? 'bg-green-600' : dayStats.submitted > 0 ? 'bg-orange-600' : 'bg-slate-400'}>
                          {dayStats.submitted}/{dayStats.total}
                        </Badge>
                      </div>

                      {/* Progress Bar with Approved/Pending */}
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                        {/* Approved portion (green) */}
                        <div
                          className="bg-green-600 transition-all"
                          style={{ width: `${dayStats.total > 0 ? (dayStats.approved / dayStats.total) * 100 : 0}%` }}
                        />
                        {/* Pending portion (orange) */}
                        <div
                          className="bg-orange-600 transition-all"
                          style={{ width: `${dayStats.total > 0 ? (dayStats.pending / dayStats.total) * 100 : 0}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-green-600 font-medium">✓ {dayStats.approved}</span>
                        <span className="text-slate-500">{submissionRate.toFixed(0)}% submitted</span>
                        <span className="text-orange-600 font-medium">⏳ {dayStats.pending}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved Timesheets Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Approved Timesheets This Week
              </CardTitle>
              <CardDescription className="mt-1">
                {approvedEntries.length} entries approved • {approvedHours.toFixed(1)} total hours
              </CardDescription>
            </div>
            {approvedEntries.length > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  Auto-approved: {approvedEntries.filter(e => e.isAutoApproved).length}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  Manager approved: {approvedEntries.filter(e => !e.isAutoApproved).length}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {approvedByEmployee.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No approved timesheets this week</p>
              <p className="text-sm mt-1">Approved entries will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvedByEmployee.map((employee) => (
                <div
                  key={employee.userId}
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  {/* Employee Header */}
                  <div
                    className="p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => setSelectedApprovedEmployee(
                      selectedApprovedEmployee === employee.userId ? null : employee.userId
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-slate-600" />
                        <div>
                          <div className="font-semibold text-slate-900">{employee.name}</div>
                          <div className="text-xs text-slate-600">{employee.employeeId}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-green-600">{employee.totalHours.toFixed(1)}h</div>
                          <div className="text-xs text-slate-500">{employee.entries.length} entries</div>
                        </div>
                        <div className="flex gap-2">
                          {employee.autoApprovedCount > 0 && (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                              {employee.autoApprovedCount} auto
                            </Badge>
                          )}
                          {employee.managerApprovedCount > 0 && (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              {employee.managerApprovedCount} by manager
                            </Badge>
                          )}
                        </div>
                        <Badge className="bg-purple-600">
                          {selectedApprovedEmployee === employee.userId ? '−' : '+'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Employee Entries */}
                  {selectedApprovedEmployee === employee.userId && (
                    <div className="p-4 space-y-3 bg-white">
                      {employee.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="border border-slate-200 rounded-lg p-4 hover:border-green-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {/* Entry Details */}
                              <div className="flex items-center gap-3 mb-2">
                                <Calendar className="h-4 w-4 text-slate-500" />
                                <span className="text-sm font-medium text-slate-700">
                                  {format(new Date(entry.workDate), 'EEE, MMM d, yyyy')}
                                </span>
                                <Clock className="h-4 w-4 text-slate-500" />
                                <span className="font-semibold text-green-600">{entry.hoursWorked}h</span>
                                {entry.isBillable ? (
                                  <Badge className="text-xs bg-green-100 text-green-700">Billable</Badge>
                                ) : (
                                  <Badge className="text-xs bg-slate-100 text-slate-700">Non-billable</Badge>
                                )}
                                {entry.project && (
                                  <span className="text-sm text-slate-600">
                                    {entry.project.name}
                                    {entry.project.projectCode && ` (${entry.project.projectCode})`}
                                  </span>
                                )}
                              </div>

                              {/* Description */}
                              <p className="text-sm text-slate-700 mb-2">{entry.description}</p>

                              {/* Approval Info */}
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                {entry.isAutoApproved ? (
                                  <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
                                    Auto-approved
                                  </Badge>
                                ) : (
                                  <Badge className="bg-green-50 text-green-700 border border-green-200">
                                    Approved by {entry.approver?.firstName} {entry.approver?.lastName}
                                  </Badge>
                                )}
                                {entry.approvedAt && (
                                  <span>
                                    on {format(new Date(entry.approvedAt), 'MMM d, yyyy h:mm a')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejected Timesheets This Week */}
      <div id="rejected-timesheets-section" className="scroll-mt-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  Rejected Timesheets This Week
                </CardTitle>
                <CardDescription className="mt-1">
                  {rejectedEntries.length} entries rejected • {stats.rejectedHours.toFixed(1)} total hours
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {rejectedEntries.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No rejected timesheets this week</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rejectedByEmployee.map((employee) => (
                  <div
                    key={employee.userId}
                    className="border border-red-200 rounded-lg overflow-hidden bg-red-50"
                  >
                    {/* Employee Header */}
                    <div
                      className="p-4 cursor-pointer hover:bg-red-100 transition-colors"
                      onClick={() =>
                        setSelectedRejectedEmployee(
                          selectedRejectedEmployee === employee.userId ? null : employee.userId
                        )
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-red-200 flex items-center justify-center">
                            <User className="h-5 w-5 text-red-700" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{employee.name}</div>
                            <div className="text-xs text-slate-600">
                              {employee.employeeId} • {employee.department || 'No Department'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold text-red-600">{employee.totalHours.toFixed(1)}h</div>
                            <div className="text-xs text-slate-500">{employee.entries.length} rejected</div>
                          </div>
                          <Badge className="bg-red-100 text-red-700">
                            {selectedRejectedEmployee === employee.userId ? '−' : '+'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Employee Entries */}
                    {selectedRejectedEmployee === employee.userId && (
                      <div className="border-t border-red-200 p-4 space-y-3 bg-white">
                        {employee.entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="border border-slate-200 rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Entry Details */}
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <Calendar className="h-4 w-4 text-slate-500" />
                                  <span className="text-sm font-medium text-slate-700">
                                    {format(new Date(entry.workDate), 'EEE, MMM d, yyyy')}
                                  </span>
                                  <Clock className="h-4 w-4 text-slate-500" />
                                  <span className="font-semibold text-red-600">{entry.hoursWorked}h</span>
                                  {entry.isBillable ? (
                                    <Badge className="text-xs bg-green-100 text-green-700">Billable</Badge>
                                  ) : (
                                    <Badge className="text-xs bg-slate-100 text-slate-700">Non-billable</Badge>
                                  )}
                                  {entry.project && (
                                    <span className="text-sm text-slate-600">
                                      {entry.project.name}
                                      {entry.project.projectCode && ` (${entry.project.projectCode})`}
                                    </span>
                                  )}
                                </div>

                                {/* Description */}
                                <p className="text-sm text-slate-700 mb-2">{entry.description}</p>

                                {/* Rejection Reason */}
                                {entry.rejectionReason && (
                                  <div className="p-2 bg-red-50 rounded border border-red-200 text-sm text-red-900 mb-2">
                                    <span className="font-medium">Rejection Reason:</span> {entry.rejectionReason}
                                  </div>
                                )}

                                {/* Rejection Info */}
                                <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                                  {entry.rejector && (
                                    <span>
                                      Rejected by {entry.rejector.firstName} {entry.rejector.lastName}
                                    </span>
                                  )}
                                  {entry.rejectedAt && (
                                    <span>
                                      on {format(new Date(entry.rejectedAt), 'MMM d, yyyy h:mm a')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Not Submitted This Week - Heatmap View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-violet-600" />
                Not Submitted This Week
              </CardTitle>
              <CardDescription className="mt-1">
                {pendingSubmissionEmployees.length} employees haven&apos;t submitted • {pendingSubmissionEmployees.filter(e => e.status === 'no_entries').length} no entries, {pendingSubmissionEmployees.filter(e => e.status === 'has_drafts').length} with drafts
              </CardDescription>
            </div>
            {pendingSubmissionEmployees.length > 0 && (
              <Button
                onClick={() => {
                  setReminderEmployeeIds(pendingSubmissionEmployees.map(e => e.userId));
                  setShowReminderDialog(true);
                }}
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Reminder to All ({pendingSubmissionEmployees.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingPendingSubmission ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto"></div>
              <p className="mt-4 text-slate-500">Loading...</p>
            </div>
          ) : pendingSubmissionEmployees.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-30 text-violet-500" />
              <p>All team members have submitted their timesheets</p>
              <p className="text-sm mt-1">No pending submissions for this week</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats Bar */}
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <span className="text-sm text-slate-600">
                      <span className="font-semibold text-red-600">{pendingSubmissionEmployees.filter(e => e.status === 'no_entries').length}</span> No Entries
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                    <span className="text-sm text-slate-600">
                      <span className="font-semibold text-amber-600">{pendingSubmissionEmployees.filter(e => e.status === 'has_drafts').length}</span> Has Drafts
                    </span>
                  </div>
                </div>
              </div>

              {/* Heatmap Grid */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Header with days of week */}
                <div className="grid grid-cols-[180px_repeat(7,1fr)] gap-px bg-slate-200 border-b border-slate-200">
                  <div className="bg-slate-50 px-3 py-2 font-medium text-slate-700 text-sm">Employee</div>
                  {(() => {
                    const days = [];
                    for (let i = 0; i < 7; i++) {
                      const day = new Date(currentWeekStart);
                      day.setDate(day.getDate() + i);
                      days.push(
                        <div key={i} className="bg-slate-50 px-2 py-2 text-center">
                          <div className="text-xs text-slate-500">{format(day, 'EEE')}</div>
                          <div className="font-medium text-slate-700">{format(day, 'd')}</div>
                        </div>
                      );
                    }
                    return days;
                  })()}
                </div>

                {/* Employee rows */}
                <div className="divide-y divide-slate-100">
                  {pendingSubmissionEmployees.map((employee) => (
                    <div
                      key={employee.userId}
                      className={`grid grid-cols-[180px_repeat(7,1fr)] gap-px items-center hover:bg-slate-50 transition-colors ${
                        employee.status === 'no_entries' ? 'bg-red-50/30' : 'bg-amber-50/30'
                      }`}
                    >
                      {/* Employee Info */}
                      <div className="px-3 py-2 flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${
                          employee.status === 'no_entries'
                            ? 'bg-gradient-to-br from-red-400 to-red-500'
                            : 'bg-gradient-to-br from-amber-400 to-amber-500'
                        }`}>
                          {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-900 text-sm truncate">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <Badge className={`text-[10px] px-1.5 py-0 ${
                            employee.status === 'no_entries'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {employee.status === 'no_entries' ? 'No Entries' : `${employee.totalDraftHours}h Draft`}
                          </Badge>
                        </div>
                      </div>

                      {/* Day cells */}
                      {(() => {
                        const cells = [];
                        for (let i = 0; i < 7; i++) {
                          const day = new Date(currentWeekStart);
                          day.setDate(day.getDate() + i);
                          const dayStr = format(day, 'yyyy-MM-dd');
                          const isWeekendDay = day.getDay() === 0 || day.getDay() === 6;

                          // Find entry for this day
                          const dayEntry = employee.draftEntries.find(e => e.workDate === dayStr);

                          cells.push(
                            <div
                              key={i}
                              className={`p-1.5 text-center min-h-[48px] flex items-center justify-center ${
                                isWeekendDay ? 'bg-slate-100' : ''
                              }`}
                            >
                              {employee.status === 'no_entries' ? (
                                <div className="h-7 w-7 rounded-lg bg-red-100 flex items-center justify-center">
                                  <span className="text-red-400 text-sm">−</span>
                                </div>
                              ) : dayEntry ? (
                                <div className="h-7 w-full max-w-[50px] rounded-lg bg-amber-100 flex items-center justify-center">
                                  <span className="text-amber-700 text-xs font-medium">{dayEntry.hoursWorked}h</span>
                                </div>
                              ) : (
                                <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center">
                                  <span className="text-slate-300 text-sm">−</span>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingSubmissionEmployees.map((employee) => (
                  <div
                    key={employee.userId}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      employee.status === 'no_entries'
                        ? 'border-red-200 bg-gradient-to-br from-red-50/50 to-rose-50/50'
                        : 'border-amber-200 bg-gradient-to-br from-amber-50/50 to-yellow-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-xs ${
                        employee.status === 'no_entries'
                          ? 'bg-gradient-to-br from-red-400 to-red-500'
                          : 'bg-gradient-to-br from-amber-400 to-amber-500'
                      }`}>
                        {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 text-sm">{employee.firstName} {employee.lastName}</div>
                        <div className="text-xs text-slate-500">
                          {employee.status === 'no_entries' ? 'No entries' : `${employee.totalDraftHours}h in ${employee.totalDraftEntries} drafts`}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReminderEmployeeIds([employee.userId]);
                        setShowReminderDialog(true);
                      }}
                      className={`h-8 px-3 ${
                        employee.status === 'no_entries'
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-amber-200 text-amber-600 hover:bg-amber-50'
                      }`}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Remind
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
      {/* End of relative p-8 container */}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog && !!selectedEntry} onOpenChange={(open) => {
        if (!open) {
          setShowRejectDialog(false);
          setSelectedEntry(null);
          setRejectionReason('');
          setRejectionCategory('');
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="bg-red-50 -mx-6 -mt-6 px-6 py-4 border-b border-red-200">
            <DialogTitle className="flex items-center gap-2 text-red-900">
              <XCircle className="h-5 w-5" />
              Reject Timesheet Entry
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4 pt-2">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertDescription className="text-orange-800">
                  Employee: {selectedEntry.user.firstName} {selectedEntry.user.lastName}
                  <br />
                  Date: {format(new Date(selectedEntry.workDate), 'MMM d, yyyy')}
                  <br />
                  Hours: {selectedEntry.hoursWorked}h
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="rejectionCategory">Rejection Category (Optional)</Label>
                <Select value={rejectionCategory} onValueChange={setRejectionCategory}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INSUFFICIENT_DETAIL">Insufficient Detail</SelectItem>
                    <SelectItem value="HOURS_EXCEED_LIMIT">Hours Exceed Limit</SelectItem>
                    <SelectItem value="WRONG_PROJECT_TASK">Wrong Project/Task</SelectItem>
                    <SelectItem value="BILLABLE_STATUS_INCORRECT">Billable Status Incorrect</SelectItem>
                    <SelectItem value="MISSING_TASK_ASSIGNMENT">Missing Task Assignment</SelectItem>
                    <SelectItem value="HOURS_TOO_LOW">Hours Too Low</SelectItem>
                    <SelectItem value="DUPLICATE_ENTRY">Duplicate Entry</SelectItem>
                    <SelectItem value="INVALID_WORK_DATE">Invalid Work Date</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rejectReason">Reason for Rejection *</Label>
                <Textarea
                  id="rejectReason"
                  placeholder="Please provide a clear reason for rejecting this entry..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">
                  This will be sent to the employee for review and resubmission.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleReject}
                  variant="destructive"
                  className="flex-1"
                  disabled={!rejectionReason.trim() || !!rejectingId}
                >
                  {rejectingId ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Rejecting...
                    </>
                  ) : (
                    'Reject Entry'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectDialog(false);
                    setSelectedEntry(null);
                    setRejectionReason('');
                    setRejectionCategory('');
                  }}
                  disabled={!!rejectingId}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Approve Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showBulkApproveConfirm}
        onClose={() => {
          setShowBulkApproveConfirm(false);
          setBulkApproveUserId(null);
          setBulkApproveDate(null);
        }}
        onConfirm={handleConfirmBulkApprove}
        title="Bulk Approve Timesheets"
        message={bulkApproveUserId ? (() => {
          let userEntries = pendingEntries.filter((e) => e.user.id === bulkApproveUserId);
          // Filter by date if provided
          if (bulkApproveDate) {
            const dateStr = formatLocalDate(bulkApproveDate);
            userEntries = userEntries.filter((e) => e.workDate === dateStr);
          }
          const user = userEntries[0]?.user;
          const dateInfo = bulkApproveDate ? ` for ${format(bulkApproveDate, 'MMMM d, yyyy')}` : '';
          return `Approve all ${userEntries.length} entries for ${user?.firstName} ${user?.lastName}${dateInfo}?\n\nTotal Hours: ${userEntries.reduce((sum, e) => sum + e.hoursWorked, 0).toFixed(1)}h`;
        })() : ''}
        confirmText="Approve All"
        cancelText="Cancel"
        variant="success"
      />

      {/* Bulk Reject Dialog */}
      <Dialog open={showBulkRejectDialog} onOpenChange={(open) => {
        if (!open) {
          setShowBulkRejectDialog(false);
          setBulkRejectEntryIds([]);
          setBulkRejectionReason('');
          setBulkRejectionCategory('');
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="bg-red-50 -mx-6 -mt-6 px-6 py-4 border-b border-red-200">
            <DialogTitle className="flex items-center gap-2 text-red-900">
              <XCircle className="h-5 w-5" />
              Bulk Reject Timesheets
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Alert className="border-orange-200 bg-orange-50">
              <AlertDescription className="text-orange-800">
                You are about to reject <strong>{bulkRejectEntryIds.length}</strong> timesheet entries.
                {(() => {
                  const totalHours = pendingEntries
                    .filter(e => bulkRejectEntryIds.includes(e.id))
                    .reduce((sum, e) => sum + e.hoursWorked, 0);
                  const uniqueEmployees = new Set(
                    pendingEntries
                      .filter(e => bulkRejectEntryIds.includes(e.id))
                      .map(e => `${e.user.firstName} ${e.user.lastName}`)
                  );
                  return (
                    <>
                      <br />
                      Total Hours: <strong>{totalHours.toFixed(1)}h</strong>
                      <br />
                      Employees: <strong>{Array.from(uniqueEmployees).join(', ')}</strong>
                    </>
                  );
                })()}
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="bulkRejectionCategory">Rejection Category (Optional)</Label>
              <Select value={bulkRejectionCategory} onValueChange={setBulkRejectionCategory}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a category..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INSUFFICIENT_DETAIL">Insufficient Detail</SelectItem>
                  <SelectItem value="HOURS_EXCEED_LIMIT">Hours Exceed Limit</SelectItem>
                  <SelectItem value="WRONG_PROJECT_TASK">Wrong Project/Task</SelectItem>
                  <SelectItem value="BILLABLE_STATUS_INCORRECT">Billable Status Incorrect</SelectItem>
                  <SelectItem value="MISSING_TASK_ASSIGNMENT">Missing Task Assignment</SelectItem>
                  <SelectItem value="HOURS_TOO_LOW">Hours Too Low</SelectItem>
                  <SelectItem value="DUPLICATE_ENTRY">Duplicate Entry</SelectItem>
                  <SelectItem value="INVALID_WORK_DATE">Invalid Work Date</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bulkRejectReason">Reason for Rejection *</Label>
              <Textarea
                id="bulkRejectReason"
                placeholder="Please provide a clear reason for rejecting these entries (min 10 characters)..."
                value={bulkRejectionReason}
                onChange={(e) => setBulkRejectionReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-1">
                This reason will be sent to all affected employees.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleBulkReject}
                variant="destructive"
                className="flex-1"
                disabled={!bulkRejectionReason.trim() || bulkRejectionReason.trim().length < 10 || bulkRejecting}
              >
                {bulkRejecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Rejecting...
                  </>
                ) : (
                  `Reject ${bulkRejectEntryIds.length} Entries`
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkRejectDialog(false);
                  setBulkRejectEntryIds([]);
                  setBulkRejectionReason('');
                  setBulkRejectionCategory('');
                }}
                disabled={bulkRejecting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={(open) => {
        if (!open) {
          setShowReminderDialog(false);
          setReminderEmployeeIds([]);
          setReminderMessage('');
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="bg-purple-50 -mx-6 -mt-6 px-6 py-4 border-b border-purple-200">
            <DialogTitle className="flex items-center gap-2 text-purple-900">
              <Send className="h-5 w-5" />
              Send Timesheet Reminder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Alert className="border-purple-200 bg-purple-50">
              <AlertDescription className="text-purple-800">
                Send a reminder to <strong>{reminderEmployeeIds.length}</strong> employee(s) who haven&apos;t submitted their timesheets for the week of{' '}
                <strong>{format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}</strong>.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="reminderMessage">Custom Message (Optional)</Label>
              <Textarea
                id="reminderMessage"
                placeholder="Add a personal note to include in the reminder email..."
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                rows={3}
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-1">
                This message will be included in the reminder email.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSendReminder}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={sendingReminder}
              >
                {sendingReminder ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Reminder{reminderEmployeeIds.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowReminderDialog(false);
                  setReminderEmployeeIds([]);
                  setReminderMessage('');
                }}
                disabled={sendingReminder}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee Timesheet Modal */}
      <Dialog open={showEmployeeModal} onOpenChange={setShowEmployeeModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Timesheet Submissions - {selectedDay && format(selectedDay, 'MMMM d, yyyy')}
            </DialogTitle>
            <DialogDescription>
              Review and approve timesheets for {selectedDay && format(selectedDay, 'EEEE')}
            </DialogDescription>
          </DialogHeader>

          {selectedDay && (
            <div className="space-y-6">
              {/* Submitted Employees */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Submitted ({getSubmittedEmployeesForDay(selectedDay).length})
                </h3>

                <div className="space-y-3">
                  {getSubmittedEmployeesForDay(selectedDay).map((employee: any) => (
                    <div key={employee.id} className="border rounded-lg">
                      {/* Employee Header */}
                      <div
                        className="p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors flex items-center justify-between"
                        onClick={() => setSelectedEmployeeId(selectedEmployeeId === employee.id ? null : employee.id)}
                      >
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-slate-600" />
                          <div>
                            <div className="font-semibold text-slate-900">
                              {employee.firstName} {employee.lastName}
                            </div>
                            <div className="text-sm text-slate-600">
                              {employee.employeeId} • {employee.entries.length} entries • {employee.totalHours.toFixed(1)}h total
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBulkApprove(employee.id, selectedDay || undefined);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve All ({employee.entries.length})
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openBulkRejectDialog(employee.entries.map((entry: TimesheetEntry) => entry.id));
                            }}
                            className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject All
                          </Button>
                          <Badge className="bg-purple-600">
                            {selectedEmployeeId === employee.id ? '−' : '+'}
                          </Badge>
                        </div>
                      </div>

                      {/* Employee Timesheets */}
                      {selectedEmployeeId === employee.id && (
                        <div className="p-4 space-y-3 bg-white">
                          {employee.entries.map((entry: TimesheetEntry) => (
                            <div
                              key={entry.id}
                              className="border border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  {/* Entry Details */}
                                  <div className="flex items-center gap-3 mb-2">
                                    <Clock className="h-4 w-4 text-slate-500" />
                                    <span className="font-semibold text-purple-600">{entry.hoursWorked}h</span>
                                    {entry.activityType && (
                                      <Badge variant="outline" className="text-xs">
                                        {entry.activityType}
                                      </Badge>
                                    )}
                                    {entry.isBillable ? (
                                      <Badge className="text-xs bg-green-100 text-green-700">Billable</Badge>
                                    ) : (
                                      <Badge className="text-xs bg-slate-100 text-slate-700">Non-billable</Badge>
                                    )}
                                    {entry.project && (
                                      <span className="text-sm text-slate-600">
                                        Project: {entry.project.name}
                                        {entry.project.projectCode && ` (${entry.project.projectCode})`}
                                      </span>
                                    )}
                                  </div>

                                  {/* Description */}
                                  <p className="text-sm text-slate-700">{entry.description}</p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 ml-4">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(entry.id)}
                                    disabled={approvingId === entry.id}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    {approvingId === entry.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                        Approving...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Approve
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedEntry(entry);
                                      setShowRejectDialog(true);
                                    }}
                                    disabled={approvingId === entry.id || rejectingId === entry.id}
                                    className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {getSubmittedEmployeesForDay(selectedDay).length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Clock className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>No submissions for this day</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pending Employees */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-orange-600" />
                    Pending ({getPendingEmployeesForDay(selectedDay).length})
                  </h3>
                  {getPendingEmployeesForDay(selectedDay).length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const pendingUserIds = getPendingEmployeesForDay(selectedDay).map((m: any) => m.userId);
                        openReminderDialog(pendingUserIds);
                      }}
                      className="text-purple-600 hover:text-purple-700 border-purple-300 hover:bg-purple-50"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Send Reminder to All
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {getPendingEmployeesForDay(selectedDay).map((member: any) => (
                    <div key={member.userId} className="border border-orange-200 bg-orange-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-orange-600" />
                          <div>
                            <div className="font-medium text-slate-900">{member.name}</div>
                            <div className="text-xs text-slate-600">{member.employeeId}</div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openReminderDialog([member.userId])}
                          className="h-7 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          title="Send reminder"
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {getPendingEmployeesForDay(selectedDay).length === 0 && (
                    <div className="col-span-2 text-center py-8 text-slate-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-30 text-green-600" />
                      <p>All team members have submitted!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
