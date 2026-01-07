'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle, XCircle, Clock, User, Calendar, Download,
  ChevronLeft, ChevronRight, Users, Receipt, CheckCircle2,
  ArrowUpRight, TrendingUp, Sparkles, Timer, Briefcase,
  CircleDot, MoreHorizontal, Filter, Eye, Send, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    department?: {
      name: string;
    };
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
  department?: string;
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

export default function AdminTimesheetApprovalsPage() {
  const router = useRouter();
  const [pendingEntries, setPendingEntries] = useState<TimesheetEntry[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showBulkApproveConfirm, setShowBulkApproveConfirm] = useState(false);
  const [bulkApproveUserId, setBulkApproveUserId] = useState<string | null>(null);
  const [bulkApproveDate, setBulkApproveDate] = useState<Date | null>(null);
  const [bulkApprovingAll, setBulkApprovingAll] = useState(false);
  const [quickFilter, setQuickFilter] = useState<string>('all');
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [approvedHours, setApprovedHours] = useState(0);
  const [approvedEntries, setApprovedEntries] = useState<ApprovedEntry[]>([]);
  const [rejectedEntries, setRejectedEntries] = useState<RejectedEntry[]>([]);
  const [weeklyExpenses, setWeeklyExpenses] = useState({ total: 0, count: 0 });

  // Overall stats (not filtered by week) for the stats cards
  const [overallStats, setOverallStats] = useState({
    totalPendingEntries: 0,
    totalPendingHours: 0,
    totalBillableHours: 0,
    totalApprovedHours: 0,
    totalRejectedCount: 0,
    totalExpenses: { total: 0, count: 0 },
  });

  // Bulk reject state
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
  const [bulkRejectEntryIds, setBulkRejectEntryIds] = useState<string[]>([]);
  const [bulkRejectionReason, setBulkRejectionReason] = useState('');
  const [bulkRejecting, setBulkRejecting] = useState(false);

  // Send reminder state
  const [sendingReminder, setSendingReminder] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderEmployeeIds, setReminderEmployeeIds] = useState<string[]>([]);
  const [reminderMessage, setReminderMessage] = useState('');

  // Approved section
  const [selectedApprovedEmployee, setSelectedApprovedEmployee] = useState<string | null>(null);

  // Rejected section
  const [selectedRejectedEmployee, setSelectedRejectedEmployee] = useState<string | null>(null);

  // Tab state for the timesheets section (pending approval, not submitted, approved)
  const [timesheetsTab, setTimesheetsTab] = useState<'pending' | 'not-submitted' | 'approved'>('pending');

  // Pending Submission state - employees with DRAFT entries who haven't submitted
  const [pendingSubmissionEmployees, setPendingSubmissionEmployees] = useState<PendingSubmissionEmployee[]>([]);
  const [loadingPendingSubmission, setLoadingPendingSubmission] = useState(false);

  // Auto-approval state for root-level users
  const [isRootLevelUser, setIsRootLevelUser] = useState(false);
  const [rootLevelPending, setRootLevelPending] = useState({ timesheets: 0, expenses: 0 });
  const [autoApproving, setAutoApproving] = useState(false);

  // Inline bulk approve state
  const [inlineBulkApprovingId, setInlineBulkApprovingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingApprovals();
    fetchAllEmployees();
  }, [selectedMember, currentWeekStart]);

  useEffect(() => {
    fetchApprovedHours();
    fetchRejectedEntries();
    fetchWeeklyExpenses();
    fetchPendingSubmissions();
  }, [currentWeekStart]);

  // Check if current user is root-level (for auto-approval)
  useEffect(() => {
    checkRootLevelStatus();
  }, []);

  // Fetch overall stats (not filtered by week) for stats cards
  useEffect(() => {
    fetchOverallStats();
  }, []);

  const checkRootLevelStatus = async () => {
    try {
      const response = await fetch('/api/employee/auto-approve');
      const data = await response.json();
      if (data.success) {
        setIsRootLevelUser(data.isRootLevel);
        setRootLevelPending({
          timesheets: data.pendingTimesheets || 0,
          expenses: data.pendingExpenses || 0,
        });
      }
    } catch (error) {
      console.error('Failed to check root level status:', error);
    }
  };

  // Fetch overall stats (all-time, not filtered by week) for stats cards
  const fetchOverallStats = async () => {
    try {
      // Fetch all data in parallel without date filters
      const [pendingRes, approvedRes, rejectedRes, expensesRes] = await Promise.all([
        fetch('/api/admin/timesheets/pending'),
        fetch('/api/admin/timesheets/approved'),
        fetch('/api/admin/timesheets/rejected'),
        fetch('/api/admin/expenses/pending'),
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

  const handleAutoApproveOwn = async () => {
    if (!isRootLevelUser) return;

    setAutoApproving(true);
    const loadingToast = toast.loading('Auto-approving your submissions...', {
      description: `Processing ${rootLevelPending.timesheets} timesheets and ${rootLevelPending.expenses} expenses`,
    });

    try {
      const response = await fetch('/api/employee/auto-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'both' }),
      });

      const data = await response.json();
      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(data.message || 'Auto-approval complete', {
          description: `${data.results?.timesheetsApproved || 0} timesheets, ${data.results?.expensesApproved || 0} expenses`,
        });
        // Refresh data
        await Promise.all([
          fetchPendingApprovals(),
          fetchApprovedHours(),
          fetchWeeklyExpenses(),
          checkRootLevelStatus(),
          fetchOverallStats(),
        ]);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to auto-approve');
    } finally {
      setAutoApproving(false);
    }
  };

  const fetchAllEmployees = async () => {
    try {
      // Fetch direct reports only using the admin team endpoint
      const response = await fetch('/api/admin/team');
      const data = await response.json();
      if (data.success) {
        setAllEmployees(data.members || []);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
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
        ? '/api/admin/timesheets/pending'
        : `/api/admin/timesheets/pending?userId=${selectedMember}`;
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

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const fetchApprovedHours = async () => {
    try {
      const startDate = formatLocalDate(currentWeekStart);
      const endDate = formatLocalDate(weekEnd);
      const response = await fetch(`/api/admin/timesheets/approved?startDate=${startDate}&endDate=${endDate}`);
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

  const fetchWeeklyExpenses = async () => {
    try {
      const startDate = formatLocalDate(currentWeekStart);
      const endDate = formatLocalDate(weekEnd);
      const response = await fetch(`/api/admin/expenses/pending?startDate=${startDate}&endDate=${endDate}&dateFilter=submittedAt`);
      const data = await response.json();
      if (data.success) {
        const pendingExpenses = (data.expenses || []).filter((e: any) => e.status === 'SUBMITTED');
        const total = pendingExpenses.reduce((sum: number, e: any) => sum + e.amount, 0) || 0;
        setWeeklyExpenses({ total, count: pendingExpenses.length });
      }
    } catch (error) {
      console.error('Failed to fetch weekly expenses:', error);
    }
  };

  // Fetch employees with DRAFT timesheets (pending submission - not yet submitted)
  const fetchPendingSubmissions = async () => {
    setLoadingPendingSubmission(true);
    try {
      const startDate = formatLocalDate(currentWeekStart);
      const endDate = formatLocalDate(weekEnd);
      const response = await fetch(`/api/admin/timesheets/pending-submission?startDate=${startDate}&endDate=${endDate}`);
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

  const fetchRejectedEntries = async () => {
    try {
      const startDate = formatLocalDate(currentWeekStart);
      const endDate = formatLocalDate(weekEnd);
      const response = await fetch(`/api/admin/timesheets/rejected?startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();
      if (data.success) {
        setRejectedEntries(data.entries || []);
      }
    } catch (error) {
      console.error('Failed to fetch rejected entries:', error);
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
        isAutoApproved: false, // Admin approved
        user: entryToApprove.user,
        project: entryToApprove.project,
        approver: null, // Will be updated on refresh
      };
      setApprovedEntries(prev => [...prev, approvedEntry]);
      setApprovedHours(prev => prev + entryToApprove.hoursWorked);
    }

    try {
      const response = await fetch(`/api/admin/timesheets/${entryId}/approve`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        toast.success('Timesheet approved successfully');
        // Refresh data in background to ensure consistency
        Promise.all([fetchPendingApprovals(), fetchApprovedHours(), fetchOverallStats()]);
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

  const handleBulkApprove = (userId: string, forDate?: Date) => {
    let userEntries = pendingEntries.filter((e) => e.user.id === userId);
    // If a date is provided, filter entries for that specific date only
    if (forDate) {
      const dateStr = formatLocalDate(forDate);
      userEntries = userEntries.filter(e => e.workDate === dateStr);
    }
    if (userEntries.length === 0) return;
    setBulkApproveUserId(userId);
    setBulkApproveDate(forDate || null);
    setShowBulkApproveConfirm(true);
  };

  // Approve all entries for a specific date
  const handleBulkApproveForDate = async (day: Date) => {
    const dateStr = formatLocalDate(day);
    const entriesForDate = pendingEntries.filter(e => e.workDate === dateStr);
    if (entriesForDate.length === 0) {
      toast.error('No pending entries for this date');
      return;
    }
    try {
      const entryIds = entriesForDate.map((e) => e.id);
      const response = await fetch('/api/admin/timesheets/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`${entryIds.length} entries approved for ${format(day, 'MMM d')}`);
        await Promise.all([fetchPendingApprovals(), fetchApprovedHours(), fetchOverallStats()]);
        setShowEmployeeModal(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to bulk approve');
    }
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
      isAutoApproved: false, // Admin approved
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
      const response = await fetch('/api/admin/timesheets/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`${entryIds.length} entries approved`);
        // Refresh data in background to ensure consistency
        Promise.all([fetchPendingApprovals(), fetchApprovedHours(), fetchOverallStats()]);
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

  const handleBulkApproveAll = async () => {
    if (pendingEntries.length === 0) {
      toast.error('No pending entries to approve');
      return;
    }
    setBulkApprovingAll(true);
    try {
      const entryIds = pendingEntries.map((e) => e.id);
      const response = await fetch('/api/admin/timesheets/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`${data.approvedCount || entryIds.length} entries approved`);
        await Promise.all([fetchPendingApprovals(), fetchApprovedHours(), fetchOverallStats()]);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to bulk approve');
    } finally {
      setBulkApprovingAll(false);
    }
  };

  const handleReject = async () => {
    if (!selectedEntry) return;
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      const response = await fetch(`/api/admin/timesheets/${selectedEntry.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Timesheet entry rejected');
        setShowRejectDialog(false);
        setSelectedEntry(null);
        setRejectionReason('');
        await Promise.all([fetchPendingApprovals(), fetchRejectedEntries(), fetchOverallStats()]);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject entry');
    }
  };

  const handleExportCSV = () => {
    if (pendingEntries.length === 0) {
      toast.error('No entries to export');
      return;
    }
    const headers = ['Employee Name', 'Employee ID', 'Email', 'Department', 'Work Date', 'Hours', 'Billable', 'Project', 'Description', 'Activity Type', 'Status', 'Submitted At'];
    const rows = pendingEntries.map((entry) => [
      `${entry.user.firstName} ${entry.user.lastName}`,
      entry.user.employeeId,
      entry.user.email,
      entry.user.department?.name || 'N/A',
      entry.workDate, // Already a string "YYYY-MM-DD" from API
      entry.hoursWorked.toString(),
      entry.isBillable ? 'Yes' : 'No',
      entry.project?.name || 'N/A',
      `"${entry.description.replace(/"/g, '""')}"`,
      entry.activityType || 'N/A',
      entry.status,
      entry.submittedAt ? format(new Date(entry.submittedAt), 'yyyy-MM-dd HH:mm') : 'N/A',
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `timesheet-approvals-${formatLocalDate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${pendingEntries.length} entries`);
  };

  const handleBulkApproveSelected = async () => {
    if (selectedEntries.size === 0) return;
    try {
      const entryIds = Array.from(selectedEntries);
      const response = await fetch('/api/admin/timesheets/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`${entryIds.length} entries approved`);
        setSelectedEntries(new Set());
        fetchPendingApprovals();
        fetchOverallStats();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to bulk approve');
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
      const response = await fetch('/api/admin/timesheets/bulk-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryIds: bulkRejectEntryIds,
          reason: bulkRejectionReason.trim(),
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
        await Promise.all([fetchPendingApprovals(), fetchApprovedHours(), fetchRejectedEntries(), fetchOverallStats()]);
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
      const response = await fetch('/api/admin/timesheets/send-reminder', {
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

  const stats = {
    totalPending: pendingEntries.length,
    totalHours: pendingEntries.reduce((sum, e) => sum + e.hoursWorked, 0),
    billableHours: pendingEntries.filter((e) => e.isBillable).reduce((sum, e) => sum + e.hoursWorked, 0),
    approvedHours: approvedHours,
    rejectedCount: rejectedEntries.length,
    rejectedHours: rejectedEntries.reduce((sum, e) => sum + e.hoursWorked, 0),
    employees: new Set(pendingEntries.map((e) => e.user.id)).size,
    teamMembers: allEmployees.length,
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
      const dateStr = entry.workDate; // Already a string "YYYY-MM-DD" from API
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

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Group pending entries by employee with date ranges
  const getPendingEntriesByEmployee = () => {
    const employeeMap = new Map<string, {
      userId: string;
      name: string;
      employeeId: string;
      email: string;
      department?: string;
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
          department: entry.user.department?.name,
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
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const getEmployeesForDay = (day: Date) => {
    const dateStr = formatLocalDate(day);
    const pendingForDay = pendingEntries.filter(e => e.workDate === dateStr);
    const approvedForDay = approvedEntries.filter(e => e.workDate === dateStr);
    const pendingUserIds = pendingForDay.map(e => e.user.id);
    const approvedUserIds = approvedForDay.map(e => e.user.id);
    const allSubmitted = Array.from(new Set([...pendingUserIds, ...approvedUserIds]));

    // Calculate hours
    const pendingHours = pendingForDay.reduce((sum, e) => sum + e.hoursWorked, 0);
    const approvedHours = approvedForDay.reduce((sum, e) => sum + e.hoursWorked, 0);

    return {
      submitted: allSubmitted.length,
      approved: Array.from(new Set(approvedUserIds)).length,
      pending: Array.from(new Set(pendingUserIds)).length,
      pendingEntryCount: pendingForDay.length,
      approvedEntryCount: approvedForDay.length,
      pendingHours,
      approvedHours,
      total: allEmployees.length,
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
          employeeMap.set(entry.user.id, { ...entry.user, entries: [], totalHours: 0 });
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
    return allEmployees.filter(member => !submittedIds.includes(member.id)).map(member => ({
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
                <p className="text-slate-500 mt-1 text-lg">Review and approve employee time entries</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-Approve Own Submissions (for root-level users) */}
            {isRootLevelUser && (rootLevelPending.timesheets > 0 || rootLevelPending.expenses > 0) && (
              <Button
                onClick={handleAutoApproveOwn}
                disabled={autoApproving}
                className="h-12 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5"
              >
                {autoApproving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2" />
                    Auto-Approving...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    Auto-Approve My ({rootLevelPending.timesheets + rootLevelPending.expenses})
                  </>
                )}
              </Button>
            )}
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
              onClick={fetchPendingApprovals}
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
              const section = document.getElementById('approved-timesheets-section');
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
          <div className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-violet-100">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                  {overallStats.totalPendingHours > 0 ? ((overallStats.totalBillableHours / overallStats.totalPendingHours) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-bold text-slate-900">{overallStats.totalBillableHours.toFixed(1)}<span className="text-2xl text-slate-400">h</span></p>
                <p className="text-sm text-slate-500 font-medium">Billable pending</p>
              </div>
            </div>
          </div>

          {/* Expenses Card */}
          <div
            className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-rose-200/30 hover:-translate-y-1 cursor-pointer"
            onClick={() => router.push('/admin/expenses')}
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
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-bold text-slate-900">${overallStats.totalExpenses.total.toFixed(0)}</p>
                <p className="text-sm text-slate-500 font-medium">{overallStats.totalExpenses.count} expense{overallStats.totalExpenses.count !== 1 ? 's' : ''} pending</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Approvals by Employee Section */}
        {pendingByEmployee.length > 0 && (
        <div className="rounded-3xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Pending Approvals by Employee</h2>
                <p className="text-slate-500 mt-0.5">
                  {pendingByEmployee.length} employee{pendingByEmployee.length !== 1 ? 's' : ''} with pending timesheets • {pendingEntries.length} entries total
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
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
                            <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 mt-0.5">
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
                          className="h-8 border-purple-300 text-purple-700 hover:bg-purple-50"
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
          </div>
        </div>
        )}

        {/* Weekly Calendar View */}
        <div className="rounded-3xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-violet-100">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Weekly Overview</h2>
                  <p className="text-slate-500 mt-0.5 flex items-center gap-4 flex-wrap">
                    <span>{format(currentWeekStart, 'MMMM d')} - {format(weekEnd, 'd, yyyy')}</span>
                    {allEmployees.length > 0 && (() => {
                      const weekApproved = new Set(approvedEntries.map(e => e.user.id)).size;
                      const weekPending = teamMembers.length;
                      const weekNotSubmitted = Math.max(0, allEmployees.length - weekApproved - weekPending);

                      return (
                        <>
                          <span className="text-slate-400">•</span>
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            <strong>{allEmployees.length}</strong> team members
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            <strong>{weekApproved}</strong> approved
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-orange-600" />
                            <strong>{weekPending}</strong> pending
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
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
                  className="h-10 w-10 p-0 rounded-xl border-2 hover:bg-primary/5 hover:border-primary/30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                  className="h-10 px-4 rounded-xl border-2 hover:bg-primary/5 hover:border-primary/30 font-medium"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
                  className="h-10 w-10 p-0 rounded-xl border-2 hover:bg-primary/5 hover:border-primary/30"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="grid grid-cols-7 gap-4">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="rounded-2xl border-2 border-slate-100 p-5 animate-pulse">
                    <div className="text-center space-y-3">
                      <div className="h-4 bg-slate-200 rounded w-12 mx-auto" />
                      <div className="h-10 bg-slate-200 rounded w-10 mx-auto" />
                      <div className="h-2 bg-slate-200 rounded-full w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-4">
                {weekDays.map((day) => {
                  const dayStats = getEmployeesForDay(day);
                  const isToday = isSameDay(day, new Date());
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const hasPending = dayStats.pendingEntryCount > 0;
                  const totalSubmitted = dayStats.submitted;
                  const totalEmployees = dayStats.total;

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => { setSelectedDay(day); setShowEmployeeModal(true); }}
                      className={`
                        relative group rounded-2xl border-2 p-4 cursor-pointer transition-all duration-300
                        ${hasPending
                          ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg shadow-amber-200/50 ring-2 ring-amber-200'
                          : isToday
                            ? 'border-primary/30 bg-gradient-to-br from-primary/5 to-violet-50 shadow-lg shadow-primary/20 ring-2 ring-primary/20'
                            : isWeekend
                              ? 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                              : 'border-slate-200 bg-white hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10'}
                        hover:-translate-y-1
                      `}
                    >
                      {/* Pending Badge - Top Right */}
                      {hasPending && (
                        <div className="absolute -top-2 -right-2 z-10">
                          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg shadow-amber-500/30 animate-pulse">
                            {dayStats.pendingEntryCount} pending
                          </div>
                        </div>
                      )}

                      <div className={`text-center mb-3 ${hasPending ? 'text-amber-700' : isToday ? 'text-primary' : isWeekend ? 'text-slate-400' : 'text-slate-600'}`}>
                        <div className="text-xs font-bold uppercase tracking-wider">{format(day, 'EEE')}</div>
                        <div className={`text-3xl font-bold mt-1 ${hasPending ? 'text-amber-600' : isToday ? 'text-primary' : ''}`}>{format(day, 'd')}</div>
                        {isToday && !hasPending && <div className="text-[10px] font-semibold text-primary mt-1">TODAY</div>}
                      </div>

                      <div className="space-y-2">
                        {/* Submission Status - X/Y submitted */}
                        <div className={`rounded-xl p-2.5 border ${
                          hasPending
                            ? 'bg-amber-100/80 border-amber-200'
                            : totalSubmitted > 0
                              ? 'bg-emerald-50 border-emerald-100'
                              : 'bg-slate-50 border-slate-100'
                        }`}>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {hasPending ? (
                                <Clock className="h-4 w-4 text-amber-600" />
                              ) : totalSubmitted > 0 ? (
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Users className="h-4 w-4 text-slate-400" />
                              )}
                              <span className={`text-lg font-bold ${
                                hasPending
                                  ? 'text-amber-700'
                                  : totalSubmitted > 0
                                    ? 'text-emerald-700'
                                    : 'text-slate-400'
                              }`}>
                                {totalSubmitted}/{totalEmployees}
                              </span>
                            </div>
                            <span className={`text-[10px] font-medium ${
                              hasPending
                                ? 'text-amber-600'
                                : totalSubmitted > 0
                                  ? 'text-emerald-600'
                                  : 'text-slate-400'
                            }`}>
                              submitted
                            </span>
                          </div>
                        </div>

                        {/* Pending vs Approved breakdown */}
                        {totalSubmitted > 0 && (
                          <div className="flex items-center justify-center gap-3 text-[10px]">
                            {dayStats.pending > 0 && (
                              <span className="flex items-center gap-1 text-amber-600 font-medium">
                                <Clock className="h-3 w-3" />
                                {dayStats.pending} pending
                              </span>
                            )}
                            {dayStats.approved > 0 && (
                              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                <CheckCircle className="h-3 w-3" />
                                {dayStats.approved} approved
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Hover Indicator */}
                      <div className={`absolute inset-x-0 bottom-0 h-1 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${hasPending ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-primary to-violet-500'}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Timesheets This Week Section - With Tabs */}
        <div id="approved-timesheets-section" className="rounded-3xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 overflow-hidden scroll-mt-8">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${
                  timesheetsTab === 'pending'
                    ? 'from-amber-100 to-orange-100'
                    : timesheetsTab === 'not-submitted'
                    ? 'from-violet-100 to-purple-100'
                    : 'from-emerald-100 to-green-100'
                }`}>
                  {timesheetsTab === 'pending' ? (
                    <Clock className="h-6 w-6 text-amber-600" />
                  ) : timesheetsTab === 'not-submitted' ? (
                    <Send className="h-6 w-6 text-violet-600" />
                  ) : (
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Timesheets This Week</h2>
                  <p className="text-slate-500 mt-0.5">
                    {timesheetsTab === 'pending'
                      ? `${pendingEntries.filter(e => {
                          const entryDate = new Date(e.workDate);
                          return entryDate >= currentWeekStart && entryDate <= weekEnd;
                        }).length} entries pending approval • ${pendingEntries.filter(e => {
                          const entryDate = new Date(e.workDate);
                          return entryDate >= currentWeekStart && entryDate <= weekEnd;
                        }).reduce((sum, e) => sum + e.hoursWorked, 0).toFixed(1)} hours`
                      : timesheetsTab === 'not-submitted'
                      ? `${pendingSubmissionEmployees.length} employees haven't submitted • ${pendingSubmissionEmployees.filter(e => e.status === 'no_entries').length} no entries, ${pendingSubmissionEmployees.filter(e => e.status === 'has_drafts').length} with drafts`
                      : `${approvedEntries.length} entries approved • ${approvedHours.toFixed(1)} total hours`
                    }
                  </p>
                </div>
              </div>

              {/* Tab Buttons */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setTimesheetsTab('pending')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      timesheetsTab === 'pending'
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="hidden sm:inline">Pending Approval</span>
                      <span className="sm:hidden">Pending</span>
                      <Badge className={`text-xs ${timesheetsTab === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
                        {pendingEntries.filter(e => {
                          const entryDate = new Date(e.workDate);
                          return entryDate >= currentWeekStart && entryDate <= weekEnd;
                        }).length}
                      </Badge>
                    </div>
                  </button>
                  <button
                    onClick={() => setTimesheetsTab('not-submitted')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      timesheetsTab === 'not-submitted'
                        ? 'bg-violet-500 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      <span className="hidden sm:inline">Not Submitted</span>
                      <span className="sm:hidden">Drafts</span>
                      <Badge className={`text-xs ${timesheetsTab === 'not-submitted' ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700'}`}>
                        {pendingSubmissionEmployees.length}
                      </Badge>
                    </div>
                  </button>
                  <button
                    onClick={() => setTimesheetsTab('approved')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      timesheetsTab === 'approved'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Approved
                      <Badge className={`text-xs ${timesheetsTab === 'approved' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                        {approvedEntries.length}
                      </Badge>
                    </div>
                  </button>
                </div>
              </div>

              {/* Approved tab info */}
              {timesheetsTab === 'approved' && approvedEntries.length > 0 && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    Auto-approved: {approvedEntries.filter(e => e.isAutoApproved).length}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    Admin approved: {approvedEntries.filter(e => !e.isAutoApproved).length}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="p-6">
            {/* Pending Tab Content */}
            {timesheetsTab === 'pending' && (
              <>
                {(() => {
                  const weekPendingEntries = pendingEntries.filter(e => {
                    const entryDate = new Date(e.workDate);
                    return entryDate >= currentWeekStart && entryDate <= weekEnd;
                  });

                  // Group by employee
                  const pendingByEmployeeMap = new Map<string, {
                    userId: string;
                    name: string;
                    employeeId: string;
                    email: string;
                    department?: string;
                    entries: typeof weekPendingEntries;
                    totalHours: number;
                  }>();

                  weekPendingEntries.forEach(entry => {
                    const userId = entry.user.id;
                    if (!pendingByEmployeeMap.has(userId)) {
                      pendingByEmployeeMap.set(userId, {
                        userId,
                        name: `${entry.user.firstName} ${entry.user.lastName}`,
                        employeeId: entry.user.employeeId,
                        email: entry.user.email,
                        department: entry.user.department?.name,
                        entries: [],
                        totalHours: 0,
                      });
                    }
                    const emp = pendingByEmployeeMap.get(userId)!;
                    emp.entries.push(entry);
                    emp.totalHours += entry.hoursWorked;
                  });

                  const weekPendingByEmployee = Array.from(pendingByEmployeeMap.values()).sort((a, b) => b.totalHours - a.totalHours);

                  if (weekPendingByEmployee.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-500">
                        <CheckCircle2 className="h-16 w-16 mx-auto mb-4 opacity-30 text-emerald-500" />
                        <p className="text-lg font-medium">No pending timesheets this week</p>
                        <p className="text-sm mt-1">All timesheets have been reviewed</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {weekPendingByEmployee.map((employee) => (
                        <div
                          key={employee.userId}
                          className="border border-amber-200 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-50/50 to-orange-50/50"
                        >
                          {/* Employee Header */}
                          <div
                            className="p-5 cursor-pointer hover:bg-amber-100/50 transition-colors"
                            onClick={() => setSelectedEmployeeId(
                              selectedEmployeeId === employee.userId ? null : employee.userId
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                                  {employee.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900 text-lg">{employee.name}</div>
                                  <div className="text-sm text-slate-600">{employee.employeeId} • {employee.department || 'N/A'}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-amber-600">{employee.totalHours.toFixed(1)}h</div>
                                  <div className="text-sm text-slate-500">{employee.entries.length} entries</div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBulkApprove(employee.userId);
                                  }}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve All
                                </Button>
                                <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center cursor-pointer hover:bg-amber-200 transition-colors">
                                  <span className="text-amber-600 font-bold">
                                    {selectedEmployeeId === employee.userId ? '−' : '+'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Employee Entries - Expandable */}
                          {selectedEmployeeId === employee.userId && (
                            <div className="p-5 pt-0 space-y-3">
                              <div className="h-px bg-amber-200 mb-4"></div>
                              {employee.entries
                                .sort((a, b) => new Date(a.workDate).getTime() - new Date(b.workDate).getTime())
                                .map((entry) => (
                                <div
                                  key={entry.id}
                                  className="border border-slate-200 rounded-xl p-4 bg-white hover:border-amber-300 transition-colors"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-700">
                                          {format(new Date(entry.workDate), 'EEE, MMM d, yyyy')}
                                        </span>
                                        <Clock className="h-4 w-4 text-slate-400" />
                                        <span className="font-semibold text-amber-600">{entry.hoursWorked}h</span>
                                        {entry.isBillable ? (
                                          <Badge className="text-xs bg-emerald-100 text-emerald-700">Billable</Badge>
                                        ) : (
                                          <Badge className="text-xs bg-slate-100 text-slate-600">Non-billable</Badge>
                                        )}
                                        {entry.project && (
                                          <span className="text-sm text-slate-600">
                                            📁 {entry.project.name}
                                            {entry.project.projectCode && ` (${entry.project.projectCode})`}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-slate-700 mb-2">{entry.description}</p>
                                      {entry.submittedAt && (
                                        <div className="text-xs text-slate-500">
                                          Submitted on {format(new Date(entry.submittedAt), 'MMM d, yyyy h:mm a')}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleApprove(entry.id)}
                                        className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedEntry(entry);
                                          setShowRejectDialog(true);
                                        }}
                                        className="text-red-600 border-red-300 hover:bg-red-50"
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}

            {/* Not Submitted Tab Content - Heatmap showing submission status */}
            {timesheetsTab === 'not-submitted' && (
              <>
                {loadingPendingSubmission ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto"></div>
                    <p className="mt-4 text-slate-500">Loading pending submissions...</p>
                  </div>
                ) : pendingSubmissionEmployees.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <CheckCircle2 className="h-16 w-16 mx-auto mb-4 opacity-30 text-violet-500" />
                    <p className="text-lg font-medium">All employees have submitted their timesheets</p>
                    <p className="text-sm mt-1">No pending submissions for this week</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary Stats Bar */}
                    <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-4 border border-violet-200">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
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
                      </div>
                    </div>

                    {/* Heatmap Grid */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      {/* Header with days of week */}
                      <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-px bg-slate-200 border-b border-slate-200">
                        <div className="bg-slate-50 px-4 py-3 font-medium text-slate-700 text-sm">Employee</div>
                        {(() => {
                          const days = [];
                          for (let i = 0; i < 7; i++) {
                            const day = new Date(currentWeekStart);
                            day.setDate(day.getDate() + i);
                            days.push(
                              <div key={i} className="bg-slate-50 px-2 py-3 text-center">
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
                            className={`grid grid-cols-[200px_repeat(7,1fr)] gap-px items-center hover:bg-slate-50 transition-colors ${
                              employee.status === 'no_entries' ? 'bg-red-50/30' : 'bg-amber-50/30'
                            }`}
                          >
                            {/* Employee Info */}
                            <div className="px-4 py-3 flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                                employee.status === 'no_entries'
                                  ? 'bg-gradient-to-br from-red-400 to-red-500'
                                  : 'bg-gradient-to-br from-amber-400 to-amber-500'
                              }`}>
                                {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-slate-900 text-sm truncate">
                                  {employee.firstName} {employee.lastName}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={`text-[10px] px-1.5 py-0 ${
                                    employee.status === 'no_entries'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {employee.status === 'no_entries' ? 'No Entries' : `${employee.totalDraftHours}h Draft`}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Day cells */}
                            {(() => {
                              const cells = [];
                              for (let i = 0; i < 7; i++) {
                                const day = new Date(currentWeekStart);
                                day.setDate(day.getDate() + i);
                                const dayStr = format(day, 'yyyy-MM-dd');
                                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                                // Find entry for this day
                                const dayEntry = employee.draftEntries.find(e => e.workDate === dayStr);

                                cells.push(
                                  <div
                                    key={i}
                                    className={`p-2 text-center min-h-[56px] flex items-center justify-center ${
                                      isWeekend ? 'bg-slate-100' : ''
                                    }`}
                                  >
                                    {employee.status === 'no_entries' ? (
                                      <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                                        <span className="text-red-400 text-lg">−</span>
                                      </div>
                                    ) : dayEntry ? (
                                      <div className="h-8 w-full max-w-[60px] rounded-lg bg-amber-100 flex items-center justify-center">
                                        <span className="text-amber-700 text-xs font-medium">{dayEntry.hoursWorked}h</span>
                                      </div>
                                    ) : (
                                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                        <span className="text-slate-300 text-lg">−</span>
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

                    {/* Quick Action Cards for No Entries Employees */}
                    {pendingSubmissionEmployees.filter(e => e.status === 'no_entries').length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-red-500"></div>
                          Employees with No Entries ({pendingSubmissionEmployees.filter(e => e.status === 'no_entries').length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {pendingSubmissionEmployees.filter(e => e.status === 'no_entries').map((employee) => (
                            <div
                              key={employee.userId}
                              className="flex items-center justify-between p-3 rounded-xl border border-red-200 bg-gradient-to-br from-red-50/50 to-rose-50/50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center text-white font-bold text-xs">
                                  {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-medium text-slate-900 text-sm">{employee.firstName} {employee.lastName}</div>
                                  <div className="text-xs text-slate-500">{employee.department}</div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setReminderEmployeeIds([employee.userId]);
                                  setShowReminderDialog(true);
                                }}
                                className="h-8 px-3 border-red-200 text-red-600 hover:bg-red-50"
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Remind
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Action Cards for Draft Employees */}
                    {pendingSubmissionEmployees.filter(e => e.status === 'has_drafts').length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                          Employees with Draft Entries ({pendingSubmissionEmployees.filter(e => e.status === 'has_drafts').length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {pendingSubmissionEmployees.filter(e => e.status === 'has_drafts').map((employee) => (
                            <div
                              key={employee.userId}
                              className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/50 to-yellow-50/50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white font-bold text-xs">
                                  {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-medium text-slate-900 text-sm">{employee.firstName} {employee.lastName}</div>
                                  <div className="text-xs text-slate-500">{employee.totalDraftHours}h in {employee.totalDraftEntries} drafts</div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setReminderEmployeeIds([employee.userId]);
                                  setShowReminderDialog(true);
                                }}
                                className="h-8 px-3 border-amber-200 text-amber-600 hover:bg-amber-50"
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Remind
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Approved Tab Content */}
            {timesheetsTab === 'approved' && (
              <>
                {approvedByEmployee.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <CheckCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No approved timesheets this week</p>
                    <p className="text-sm mt-1">Approved entries will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {approvedByEmployee.map((employee) => (
                  <div
                    key={employee.userId}
                    className="border border-emerald-200 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-50/50 to-green-50/50"
                  >
                    {/* Employee Header */}
                    <div
                      className="p-5 cursor-pointer hover:bg-emerald-100/50 transition-colors"
                      onClick={() => setSelectedApprovedEmployee(
                        selectedApprovedEmployee === employee.userId ? null : employee.userId
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white font-bold text-lg">
                            {employee.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-lg">{employee.name}</div>
                            <div className="text-sm text-slate-600">{employee.employeeId}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-emerald-600">{employee.totalHours.toFixed(1)}h</div>
                            <div className="text-sm text-slate-500">{employee.entries.length} entries</div>
                          </div>
                          <div className="flex gap-2">
                            {employee.autoApprovedCount > 0 && (
                              <Badge className="bg-blue-100 text-blue-700 text-xs px-2">
                                {employee.autoApprovedCount} auto
                              </Badge>
                            )}
                            {employee.managerApprovedCount > 0 && (
                              <Badge className="bg-emerald-100 text-emerald-700 text-xs px-2">
                                {employee.managerApprovedCount} by admin
                              </Badge>
                            )}
                          </div>
                          <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center cursor-pointer hover:bg-emerald-200 transition-colors">
                            <span className="text-emerald-600 font-bold">
                              {selectedApprovedEmployee === employee.userId ? '−' : '+'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Employee Entries - Expandable */}
                    {selectedApprovedEmployee === employee.userId && (
                      <div className="p-5 pt-0 space-y-3">
                        <div className="h-px bg-emerald-200 mb-4"></div>
                        {employee.entries
                          .sort((a, b) => new Date(a.workDate).getTime() - new Date(b.workDate).getTime())
                          .map((entry) => (
                          <div
                            key={entry.id}
                            className="border border-slate-200 rounded-xl p-4 bg-white hover:border-emerald-300 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Entry Details */}
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <Calendar className="h-4 w-4 text-slate-400" />
                                  <span className="text-sm font-medium text-slate-700">
                                    {format(new Date(entry.workDate), 'EEE, MMM d, yyyy')}
                                  </span>
                                  <Clock className="h-4 w-4 text-slate-400" />
                                  <span className="font-semibold text-emerald-600">{entry.hoursWorked}h</span>
                                  {entry.isBillable ? (
                                    <Badge className="text-xs bg-emerald-100 text-emerald-700">Billable</Badge>
                                  ) : (
                                    <Badge className="text-xs bg-slate-100 text-slate-600">Non-billable</Badge>
                                  )}
                                  {entry.project && (
                                    <span className="text-sm text-slate-600">
                                      📁 {entry.project.name}
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
                                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
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
          </>
        )}
          </div>
        </div>

        {/* Rejected Timesheets This Week Section */}
        <div id="rejected-timesheets-section" className="rounded-3xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 overflow-hidden scroll-mt-8">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-red-100 to-rose-100">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Rejected Timesheets This Week</h2>
                  <p className="text-slate-500 mt-0.5">
                    {rejectedEntries.length} entries rejected • {stats.rejectedHours.toFixed(1)} total hours • Awaiting resubmission
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            {rejectedByEmployee.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <XCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No rejected timesheets this week</p>
                <p className="text-sm mt-1">Rejected entries will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rejectedByEmployee.map((employee) => (
                  <div
                    key={employee.userId}
                    className="border border-red-200 rounded-2xl overflow-hidden bg-gradient-to-br from-red-50/50 to-rose-50/50"
                  >
                    {/* Employee Header */}
                    <div
                      className="p-5 cursor-pointer hover:bg-red-100/50 transition-colors"
                      onClick={() => setSelectedRejectedEmployee(
                        selectedRejectedEmployee === employee.userId ? null : employee.userId
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center text-white font-bold text-lg">
                            {employee.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-lg">{employee.name}</div>
                            <div className="text-sm text-slate-600 flex items-center gap-2">
                              {employee.employeeId}
                              {employee.department && (
                                <>
                                  <span className="text-slate-400">•</span>
                                  <span>{employee.department}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-red-600">{employee.totalHours.toFixed(1)}h</div>
                            <div className="text-sm text-slate-500">{employee.entries.length} entries</div>
                          </div>
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs px-3 py-1">
                            Awaiting Resubmission
                          </Badge>
                          <div className="h-9 w-9 rounded-lg bg-red-100 flex items-center justify-center cursor-pointer hover:bg-red-200 transition-colors">
                            <span className="text-red-600 font-bold">
                              {selectedRejectedEmployee === employee.userId ? '−' : '+'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Employee Entries - Expandable */}
                    {selectedRejectedEmployee === employee.userId && (
                      <div className="p-5 pt-0 space-y-3">
                        <div className="h-px bg-red-200 mb-4"></div>
                        {employee.entries
                          .sort((a, b) => new Date(b.rejectedAt || 0).getTime() - new Date(a.rejectedAt || 0).getTime())
                          .map((entry) => (
                          <div
                            key={entry.id}
                            className="border-2 border-red-200 rounded-xl p-4 bg-white hover:border-red-300 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Entry Details */}
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <Calendar className="h-4 w-4 text-slate-400" />
                                  <span className="text-sm font-medium text-slate-700">
                                    {format(new Date(entry.workDate), 'EEE, MMM d, yyyy')}
                                  </span>
                                  <Clock className="h-4 w-4 text-slate-400" />
                                  <span className="font-semibold text-red-600">{entry.hoursWorked}h</span>
                                  {entry.isBillable ? (
                                    <Badge className="text-xs bg-green-100 text-green-700">Billable</Badge>
                                  ) : (
                                    <Badge className="text-xs bg-slate-100 text-slate-600">Non-billable</Badge>
                                  )}
                                  {entry.activityType && (
                                    <Badge variant="outline" className="text-xs">
                                      {entry.activityType}
                                    </Badge>
                                  )}
                                  {entry.project && (
                                    <span className="text-sm text-slate-600">
                                      📁 {entry.project.name}
                                      {entry.project.projectCode && ` (${entry.project.projectCode})`}
                                    </span>
                                  )}
                                </div>

                                {/* Description */}
                                <p className="text-sm text-slate-700 mb-3 pl-1">{entry.description}</p>

                                {/* Rejection Info - Highlighted */}
                                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                                  <div className="flex items-start gap-2">
                                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <div className="text-xs font-semibold text-red-900 mb-1">Rejection Reason:</div>
                                      <p className="text-sm text-red-800">{entry.rejectionReason || 'No reason provided'}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-red-700 mt-2 pt-2 border-t border-red-200">
                                    {entry.rejector && (
                                      <>
                                        <span>Rejected by {entry.rejector.firstName} {entry.rejector.lastName}</span>
                                        {entry.rejectedAt && (
                                          <>
                                            <span className="text-red-400">•</span>
                                            <span>{format(new Date(entry.rejectedAt), 'MMM d, yyyy h:mm a')}</span>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </div>
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
          </div>
        </div>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog && !!selectedEntry} onOpenChange={(open) => {
          if (!open) {
            setShowRejectDialog(false);
            setSelectedEntry(null);
            setRejectionReason('');
          }
        }}>
          <DialogContent className="max-w-lg p-0 overflow-hidden rounded-3xl">
            <div className="p-6 bg-gradient-to-r from-rose-500 to-pink-600">
              <div className="flex items-center gap-3 text-white">
                <div className="p-2 rounded-xl bg-white/20">
                  <XCircle className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white">Reject Timesheet</DialogTitle>
                  <DialogDescription className="text-rose-100 text-sm">This action will notify the employee</DialogDescription>
                </div>
              </div>
            </div>
            {selectedEntry && (
              <div className="p-6 space-y-5">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="h-5 w-5 text-slate-400" />
                    <span className="font-semibold text-slate-900">
                      {selectedEntry.user.firstName} {selectedEntry.user.lastName}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Date:</span>
                      <span className="ml-2 font-medium">{format(new Date(selectedEntry.workDate), 'MMM d, yyyy')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Hours:</span>
                      <span className="ml-2 font-medium">{selectedEntry.hoursWorked}h</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="rejectReason" className="text-sm font-semibold text-slate-700">Rejection Reason</Label>
                  <Textarea
                    id="rejectReason"
                    placeholder="Provide a clear reason for the employee..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="mt-2 rounded-xl border-2 border-slate-200 focus:border-rose-300 focus:ring-rose-200"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleReject}
                    disabled={!rejectionReason.trim() || !!rejectingId}
                    className="flex-1 h-12 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold rounded-xl"
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
                    onClick={() => { setShowRejectDialog(false); setSelectedEntry(null); setRejectionReason(''); }}
                    disabled={!!rejectingId}
                    className="h-12 px-6 rounded-xl border-2"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk Approve Confirmation */}
        <ConfirmDialog
          isOpen={showBulkApproveConfirm}
          onClose={() => { setShowBulkApproveConfirm(false); setBulkApproveUserId(null); setBulkApproveDate(null); }}
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

        {/* Employee Modal */}
        <Dialog open={showEmployeeModal} onOpenChange={setShowEmployeeModal}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl border-0 shadow-2xl">
            <DialogHeader className="pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold text-slate-900">
                      {selectedDay && format(selectedDay, 'EEEE, MMMM d, yyyy')}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 mt-1">
                      Review and manage timesheet submissions
                    </DialogDescription>
                  </div>
                </div>
                {selectedDay && getSubmittedEmployeesForDay(selectedDay).length > 0 && (
                  <Button
                    onClick={() => handleBulkApproveForDate(selectedDay)}
                    className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve All for {format(selectedDay, 'MMM d')}
                  </Button>
                )}
              </div>
            </DialogHeader>

            {selectedDay && (
              <div className="space-y-6 pt-4">
                {/* Submitted Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-amber-100">
                      <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Pending Approval ({getSubmittedEmployeesForDay(selectedDay).length})
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {getSubmittedEmployeesForDay(selectedDay).map((employee: any) => (
                      <div key={employee.id} className="rounded-2xl border-2 border-slate-200 overflow-hidden transition-all duration-300 hover:border-violet-200 hover:shadow-lg">
                        <div
                          className="p-4 bg-gradient-to-r from-slate-50 to-white cursor-pointer flex items-center justify-between"
                          onClick={() => setSelectedEmployeeId(selectedEmployeeId === employee.id ? null : employee.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-500/25">
                              {employee.firstName?.[0]}{employee.lastName?.[0]}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{employee.firstName} {employee.lastName}</div>
                              <div className="text-sm text-slate-500">
                                {employee.employeeId} • {employee.department?.name || 'N/A'} • {employee.entries.length} entries • <span className="font-semibold text-violet-600">{employee.totalHours.toFixed(1)}h</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Button
                              size="sm"
                              disabled={inlineBulkApprovingId === employee.id}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setInlineBulkApprovingId(employee.id);
                                // Only approve entries for this employee for this specific date
                                const entryIds = employee.entries.map((entry: TimesheetEntry) => entry.id);
                                try {
                                  const response = await fetch('/api/admin/timesheets/bulk-approve', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ entryIds }),
                                  });
                                  const data = await response.json();
                                  if (data.success) {
                                    toast.success(`${entryIds.length} entries approved for ${employee.firstName}`);
                                    await Promise.all([fetchPendingApprovals(), fetchApprovedHours(), fetchOverallStats()]);
                                  } else {
                                    throw new Error(data.error);
                                  }
                                } catch (error: any) {
                                  toast.error(error.message || 'Failed to approve');
                                } finally {
                                  setInlineBulkApprovingId(null);
                                }
                              }}
                              className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white rounded-xl shadow-lg shadow-purple-500/25"
                            >
                              {inlineBulkApprovingId === employee.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve ({employee.entries.length})
                                </>
                              )}
                            </Button>
                            <div className={`w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center transition-transform duration-300 ${selectedEmployeeId === employee.id ? 'rotate-180' : ''}`}>
                              <ChevronRight className="h-5 w-5 text-slate-400 -rotate-90" />
                            </div>
                          </div>
                        </div>

                        {selectedEmployeeId === employee.id && (
                          <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                            {employee.entries.map((entry: TimesheetEntry) => (
                              <div key={entry.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-violet-200 transition-all duration-300">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                      <span className="text-lg font-bold text-violet-600">{entry.hoursWorked}h</span>
                                      {entry.activityType && (
                                        <Badge variant="outline" className="rounded-lg">{entry.activityType}</Badge>
                                      )}
                                      <Badge className={`rounded-lg ${entry.isBillable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {entry.isBillable ? 'Billable' : 'Non-billable'}
                                      </Badge>
                                      {entry.project && (
                                        <span className="text-sm text-slate-500">
                                          {entry.project.name} {entry.project.projectCode && `(${entry.project.projectCode})`}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-slate-700">{entry.description}</p>
                                  </div>
                                  <div className="flex gap-2 ml-4">
                                    <Button
                                      size="sm"
                                      onClick={() => handleApprove(entry.id)}
                                      disabled={approvingId === entry.id || rejectingId === entry.id}
                                      className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white rounded-xl"
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
                                      onClick={() => { setSelectedEntry(entry); setShowRejectDialog(true); }}
                                      disabled={approvingId === entry.id || rejectingId === entry.id}
                                      className="rounded-xl border-2 border-rose-200 text-rose-600 hover:bg-rose-50"
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
                      <div className="text-center py-12 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">No pending submissions for this day</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Not Submitted Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-rose-100">
                        <XCircle className="h-4 w-4 text-rose-600" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Not Submitted ({getPendingEmployeesForDay(selectedDay).length})
                      </h3>
                    </div>
                    {getPendingEmployeesForDay(selectedDay).length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const pendingUserIds = getPendingEmployeesForDay(selectedDay).map((m: any) => m.userId);
                          openReminderDialog(pendingUserIds);
                        }}
                        className="text-violet-600 hover:text-violet-700 border-violet-300 hover:bg-violet-50"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Send Reminder to All
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {getPendingEmployeesForDay(selectedDay).slice(0, 12).map((member: any) => (
                      <div key={member.userId} className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-rose-200 flex items-center justify-center text-rose-700 font-semibold text-sm">
                              {member.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900 truncate">{member.name}</div>
                              <div className="text-xs text-slate-500">{member.employeeId}</div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openReminderDialog([member.userId])}
                            className="h-7 px-2 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                            title="Send reminder"
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {getPendingEmployeesForDay(selectedDay).length > 12 && (
                    <p className="text-center text-sm text-slate-500 mt-4">
                      +{getPendingEmployeesForDay(selectedDay).length - 12} more employees
                    </p>
                  )}

                  {getPendingEmployeesForDay(selectedDay).length === 0 && (
                    <div className="text-center py-8 rounded-2xl bg-emerald-50 border-2 border-dashed border-emerald-200">
                      <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
                      <p className="text-emerald-700 font-medium">All employees have submitted!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk Reject Dialog */}
        <Dialog open={showBulkRejectDialog} onOpenChange={(open) => {
          if (!open) {
            setShowBulkRejectDialog(false);
            setBulkRejectEntryIds([]);
            setBulkRejectionReason('');
          }
        }}>
          <DialogContent className="max-w-lg p-0 overflow-hidden rounded-3xl">
            <div className="p-6 bg-gradient-to-r from-rose-500 to-pink-600">
              <div className="flex items-center gap-3 text-white">
                <div className="p-2 rounded-xl bg-white/20">
                  <XCircle className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white">Bulk Reject Timesheets</DialogTitle>
                  <DialogDescription className="text-rose-100 text-sm">Rejecting {bulkRejectEntryIds.length} entries</DialogDescription>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200">
                <p className="text-orange-800 text-sm">
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
                </p>
              </div>

              <div>
                <Label htmlFor="bulkRejectReason" className="text-sm font-semibold text-slate-700">Reason for Rejection *</Label>
                <Textarea
                  id="bulkRejectReason"
                  placeholder="Please provide a clear reason for rejecting these entries (min 10 characters)..."
                  value={bulkRejectionReason}
                  onChange={(e) => setBulkRejectionReason(e.target.value)}
                  rows={4}
                  className="mt-2 rounded-xl border-2 border-slate-200 focus:border-rose-300 focus:ring-rose-200"
                />
                <p className="text-xs text-slate-500 mt-1">
                  This reason will be sent to all affected employees.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleBulkReject}
                  disabled={!bulkRejectionReason.trim() || bulkRejectionReason.trim().length < 10 || bulkRejecting}
                  className="flex-1 h-12 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold rounded-xl"
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
                  }}
                  disabled={bulkRejecting}
                  className="h-12 px-6 rounded-xl border-2"
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
          <DialogContent className="max-w-lg p-0 overflow-hidden rounded-3xl">
            <div className="p-6 bg-gradient-to-r from-violet-500 to-purple-600">
              <div className="flex items-center gap-3 text-white">
                <div className="p-2 rounded-xl bg-white/20">
                  <Send className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white">Send Timesheet Reminder</DialogTitle>
                  <DialogDescription className="text-violet-100 text-sm">Remind employees to submit timesheets</DialogDescription>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200">
                <p className="text-violet-800 text-sm">
                  Send a reminder to <strong>{reminderEmployeeIds.length}</strong> employee(s) who haven&apos;t submitted their timesheets for the week of{' '}
                  <strong>{format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}</strong>.
                </p>
              </div>

              <div>
                <Label htmlFor="reminderMessage" className="text-sm font-semibold text-slate-700">Custom Message (Optional)</Label>
                <Textarea
                  id="reminderMessage"
                  placeholder="Add a personal note to include in the reminder email..."
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  rows={3}
                  className="mt-2 rounded-xl border-2 border-slate-200 focus:border-violet-300 focus:ring-violet-200"
                />
                <p className="text-xs text-slate-500 mt-1">
                  This message will be included in the reminder email.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSendReminder}
                  disabled={sendingReminder}
                  className="flex-1 h-12 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold rounded-xl"
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
                  className="h-12 px-6 rounded-xl border-2"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
