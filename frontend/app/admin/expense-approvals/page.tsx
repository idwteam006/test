'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  FileText,
  AlertCircle,
  Filter,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  Receipt,
  Eye,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, isSameDay } from 'date-fns';
import { CATEGORY_COLORS, STATUS_CONFIG } from '@/lib/expense-constants';
import { safeOpenUrl } from '@/lib/url-utils';

interface PendingExpense {
  id: string;
  claimNumber: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  expenseDate: string;
  status: string;
  description: string;
  receiptUrls?: string[];
  submittedAt?: string;
  reviewedAt?: string;
  notes?: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: {
      name: string;
    };
  };
}

interface Summary {
  totalExpenses: number;
  totalAmount: number;
  byCategory: Record<string, { count: number; amount: number }>;
  byEmployee: Record<string, { name: string; count: number; amount: number }>;
}

interface RejectedExpense {
  id: string;
  claimNumber: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  expenseDate: string;
  status: string;
  description: string;
  receiptUrls?: string[];
  submittedAt?: string;
  reviewedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  notes?: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: {
      name: string;
    };
  };
  rejector?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

const categoryColors = CATEGORY_COLORS;
const statusConfig = STATUS_CONFIG;

export default function AdminExpenseApprovalsPage() {
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<PendingExpense[]>([]);
  const [allExpenses, setAllExpenses] = useState<PendingExpense[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingExpense, setRejectingExpense] = useState<PendingExpense | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [bulkApprovingAll, setBulkApprovingAll] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

  // Filter states
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Weekly view states
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [approvedExpenses, setApprovedExpenses] = useState<any[]>([]);
  const [rejectedExpenses, setRejectedExpenses] = useState<RejectedExpense[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [selectedRejectedEmployee, setSelectedRejectedEmployee] = useState<string | null>(null);

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  useEffect(() => {
    fetchPendingExpenses();
    fetchApprovedExpenses();
    fetchRejectedExpenses();
    fetchAllEmployees();
  }, [currentWeekStart]);

  useEffect(() => {
    applyFilters();
  }, [selectedEmployee, startDate, endDate, allExpenses, activeTab]);

  const fetchAllEmployees = async () => {
    try {
      const response = await fetch('/api/admin/employees');
      const data = await response.json();

      if (data.success) {
        setAllEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchPendingExpenses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manager/expenses/pending');
      const data = await response.json();

      if (data.success) {
        setAllExpenses(data.expenses || []);
        setExpenses(data.expenses || []);
        setSummary(data.summary || null);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to fetch pending expenses:', error);
      toast.error(error.message || 'Failed to load pending expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedExpenses = async () => {
    try {
      const startDateStr = currentWeekStart.toISOString().split('T')[0];
      const endDateStr = weekEnd.toISOString().split('T')[0];

      const response = await fetch(
        `/api/manager/expenses/approved?startDate=${startDateStr}&endDate=${endDateStr}`
      );
      const data = await response.json();

      if (data.success) {
        setApprovedExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error('Failed to fetch approved expenses:', error);
    }
  };

  const fetchRejectedExpenses = async () => {
    try {
      const startDateStr = currentWeekStart.toISOString().split('T')[0];
      const endDateStr = weekEnd.toISOString().split('T')[0];

      const response = await fetch(
        `/api/admin/expenses/rejected?startDate=${startDateStr}&endDate=${endDateStr}`
      );
      const data = await response.json();

      if (data.success) {
        setRejectedExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error('Failed to fetch rejected expenses:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...allExpenses];

    if (activeTab === 'pending') {
      filtered = filtered.filter((exp) => exp.status === 'SUBMITTED');
    } else {
      filtered = filtered.filter((exp) => exp.status === 'APPROVED' || exp.status === 'PAID');
    }

    if (selectedEmployee !== 'all') {
      filtered = filtered.filter((exp) => exp.user.id === selectedEmployee);
    }

    if (startDate) {
      filtered = filtered.filter((exp) => new Date(exp.expenseDate) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter((exp) => new Date(exp.expenseDate) <= new Date(endDate));
    }

    setExpenses(filtered);
  };

  const handleClearFilters = () => {
    setSelectedEmployee('all');
    setStartDate('');
    setEndDate('');
  };

  const getUniqueEmployees = () => {
    const employeeMap = new Map();
    allExpenses.forEach((exp) => {
      if (!employeeMap.has(exp.user.id)) {
        employeeMap.set(exp.user.id, {
          id: exp.user.id,
          name: `${exp.user.firstName} ${exp.user.lastName}`,
          email: exp.user.email,
        });
      }
    });
    return Array.from(employeeMap.values());
  };

  const handleApprove = async (expenseId: string) => {
    setApprovingId(expenseId);

    try {
      const response = await fetch(`/api/manager/expenses/${expenseId}/approve`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Expense approved successfully');
        await Promise.all([fetchPendingExpenses(), fetchApprovedExpenses()]);
        if (selectedEmployeeId) {
          const remainingForEmployee = getSubmittedEmployeesForDay(selectedDay!).find(
            (e: any) => e.id === selectedEmployeeId
          );
          if (!remainingForEmployee || remainingForEmployee.entries.length <= 1) {
            setSelectedEmployeeId(null);
          }
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to approve expense:', error);
      toast.error(error.message || 'Failed to approve expense');
    } finally {
      setApprovingId(null);
    }
  };

  const handleBulkApprove = async (userId: string) => {
    const userExpenses = allExpenses.filter(
      (e) => e.user.id === userId && e.status === 'SUBMITTED'
    );

    if (userExpenses.length === 0) return;

    setApprovingId(userId);

    try {
      const response = await fetch('/api/manager/expenses/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseIds: userExpenses.map((e) => e.id) }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || `${data.approvedCount} expenses approved`);
        await Promise.all([fetchPendingExpenses(), fetchApprovedExpenses()]);
        setSelectedEmployeeId(null);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to bulk approve:', error);
      toast.error(error.message || 'Failed to bulk approve');
    } finally {
      setApprovingId(null);
    }
  };

  const handleBulkApproveAll = async () => {
    const pendingExpenses = allExpenses.filter((e) => e.status === 'SUBMITTED');

    if (pendingExpenses.length === 0) {
      toast.error('No pending expenses to approve');
      return;
    }

    setBulkApprovingAll(true);

    try {
      const response = await fetch('/api/manager/expenses/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseIds: pendingExpenses.map((e) => e.id) }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || `${data.approvedCount} expenses approved`, {
          description: `Approved expenses from: ${data.employees?.join(', ')}`,
        });
        await Promise.all([fetchPendingExpenses(), fetchApprovedExpenses()]);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to bulk approve all:', error);
      toast.error(error.message || 'Failed to bulk approve');
    } finally {
      setBulkApprovingAll(false);
    }
  };

  const handleRejectClick = (expense: PendingExpense) => {
    setRejectingExpense(expense);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingExpense) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setRejectingId(rejectingExpense.id);
    setShowRejectDialog(false);

    try {
      const response = await fetch(`/api/manager/expenses/${rejectingExpense.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Expense rejected');
        await Promise.all([fetchPendingExpenses(), fetchRejectedExpenses()]);
        setRejectingExpense(null);
        setRejectionReason('');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to reject expense:', error);
      toast.error(error.message || 'Failed to reject expense');
    } finally {
      setRejectingId(null);
    }
  };

  const handleExportCSV = () => {
    if (expenses.length === 0) {
      toast.error('No expenses to export');
      return;
    }

    const headers = [
      'Claim Number',
      'Employee Name',
      'Employee ID',
      'Email',
      'Department',
      'Title',
      'Category',
      'Amount',
      'Currency',
      'Expense Date',
      'Status',
      'Description',
      'Submitted At',
    ];

    const rows = expenses.map((expense) => [
      expense.claimNumber,
      `${expense.user.firstName} ${expense.user.lastName}`,
      expense.user.employeeId,
      expense.user.email,
      expense.user.department?.name || 'N/A',
      `"${expense.title.replace(/"/g, '""')}"`,
      expense.category,
      expense.amount.toString(),
      expense.currency,
      expense.expenseDate, // Already a string "YYYY-MM-DD" from API
      expense.status,
      `"${expense.description.replace(/"/g, '""')}"`,
      expense.submittedAt ? format(new Date(expense.submittedAt), 'yyyy-MM-dd HH:mm') : 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `admin-expenses-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${expenses.length} expenses to CSV`);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getEmployeesForDay = (day: Date) => {
    const dateStr = day.toISOString().split('T')[0];

    const pending = allExpenses
      .filter(
        (e) =>
          e.expenseDate === dateStr && e.status === 'SUBMITTED'
      )
      .map((e) => e.user.id);

    const approved = approvedExpenses
      .filter((e) => e.expenseDate === dateStr)
      .map((e) => e.user.id);

    const allSubmitted = Array.from(new Set([...pending, ...approved]));
    const uniqueApproved = Array.from(new Set(approved));
    const uniquePending = Array.from(new Set(pending));

    const pendingAmount = allExpenses
      .filter(
        (e) =>
          e.expenseDate === dateStr && e.status === 'SUBMITTED'
      )
      .reduce((sum, e) => sum + e.amount, 0);

    const approvedAmount = approvedExpenses
      .filter((e) => e.expenseDate === dateStr)
      .reduce((sum: number, e: any) => sum + e.amount, 0);

    return {
      submitted: allSubmitted.length,
      approved: uniqueApproved.length,
      pending: uniquePending.length,
      total: allEmployees.length,
      pendingAmount,
      approvedAmount,
    };
  };

  const getSubmittedEmployeesForDay = (day: Date) => {
    if (!day) return [];
    const dateStr = day.toISOString().split('T')[0];
    const employeeMap = new Map();

    allExpenses.forEach((expense) => {
      if (
        expense.expenseDate === dateStr &&
        expense.status === 'SUBMITTED'
      ) {
        if (!employeeMap.has(expense.user.id)) {
          employeeMap.set(expense.user.id, {
            ...expense.user,
            entries: [],
            totalAmount: 0,
          });
        }
        const emp = employeeMap.get(expense.user.id);
        emp.entries.push(expense);
        emp.totalAmount += expense.amount;
      }
    });

    return Array.from(employeeMap.values());
  };

  const getApprovedEmployeesForDay = (day: Date) => {
    if (!day) return [];
    const dateStr = day.toISOString().split('T')[0];
    const employeeMap = new Map();

    approvedExpenses.forEach((expense: any) => {
      if (expense.expenseDate === dateStr) {
        if (!employeeMap.has(expense.user.id)) {
          employeeMap.set(expense.user.id, {
            ...expense.user,
            entries: [],
            totalAmount: 0,
          });
        }
        const emp = employeeMap.get(expense.user.id);
        emp.entries.push(expense);
        emp.totalAmount += expense.amount;
      }
    });

    return Array.from(employeeMap.values());
  };

  const pendingCount = allExpenses.filter((e) => e.status === 'SUBMITTED').length;
  const pendingAmount = allExpenses
    .filter((e) => e.status === 'SUBMITTED')
    .reduce((sum, e) => sum + e.amount, 0);
  const approvedCount = approvedExpenses.length;
  const approvedAmount = approvedExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  const rejectedCount = rejectedExpenses.length;
  const rejectedAmount = rejectedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const uniqueEmployees = new Set(allExpenses.map((e) => e.user.id)).size;

  // Group rejected expenses by employee
  const getRejectedExpensesByEmployee = () => {
    const employeeMap = new Map<string, {
      userId: string;
      name: string;
      employeeId: string;
      email: string;
      department?: string;
      expenses: RejectedExpense[];
      totalAmount: number;
    }>();

    rejectedExpenses.forEach(expense => {
      const userId = expense.user.id;
      if (!employeeMap.has(userId)) {
        employeeMap.set(userId, {
          userId,
          name: `${expense.user.firstName} ${expense.user.lastName}`,
          employeeId: expense.user.employeeId,
          email: expense.user.email,
          department: expense.user.department?.name,
          expenses: [],
          totalAmount: 0,
        });
      }
      const employee = employeeMap.get(userId)!;
      employee.expenses.push(expense);
      employee.totalAmount += expense.amount;
    });

    return Array.from(employeeMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  };

  const rejectedByEmployee = getRejectedExpensesByEmployee();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Expense Approvals</h1>
          <p className="text-slate-600 mt-1">Admin view - Review and approve all expense claims</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Button
              onClick={handleBulkApproveAll}
              disabled={bulkApprovingAll}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {bulkApprovingAll ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Bulk Approve All ({pendingCount})
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={expenses.length === 0}
            className="hover:bg-green-50 hover:text-green-700 hover:border-green-300"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={fetchPendingExpenses}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="h-4 bg-slate-200 rounded animate-pulse w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="h-9 bg-slate-200 rounded animate-pulse w-20 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded animate-pulse w-24"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Pending Approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{pendingCount}</div>
                <p className="text-xs text-slate-500 mt-1">Claims</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Pending Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(pendingAmount)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Awaiting Approval</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Approved This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{approvedCount}</div>
                <p className="text-xs text-slate-500 mt-1">Claims</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Approved Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(approvedAmount)}
                </div>
                <p className="text-xs text-slate-500 mt-1">This Week</p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg transition-all hover:border-red-300"
              onClick={() => {
                const section = document.getElementById('rejected-expenses-section');
                section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Rejected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{rejectedCount}</div>
                <p className="text-xs text-slate-500 mt-1">{formatCurrency(rejectedAmount)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-600">{uniqueEmployees}</div>
                <p className="text-xs text-slate-500 mt-1">With Submissions</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Weekly Calendar View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                Weekly Expense Overview
              </CardTitle>
              <CardDescription className="mt-1 flex items-center gap-4">
                <span>
                  {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                </span>
                <span className="text-slate-400">|</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-orange-600" />
                  <strong>{pendingCount}</strong> pending
                </span>
                <span className="text-slate-400">|</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  <strong>{approvedCount}</strong> approved
                </span>
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
            <div className="grid grid-cols-7 gap-3">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-4">
                  <div className="text-center mb-3">
                    <div className="h-3 bg-slate-200 rounded animate-pulse w-8 mx-auto mb-2"></div>
                    <div className="h-8 bg-slate-200 rounded animate-pulse w-10 mx-auto"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-slate-200 rounded-full animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-3">
              {weekDays.map((day) => {
                const dayStats = getEmployeesForDay(day);
                const isToday = isSameDay(day, new Date());
                const hasActivity = dayStats.pending > 0 || dayStats.approved > 0;

                return (
                  <div
                    key={day.toISOString()}
                    className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg ${
                      isToday
                        ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-200'
                        : hasActivity
                          ? 'border-slate-200 hover:border-purple-300'
                          : 'border-slate-100 bg-slate-50'
                    }`}
                    onClick={() => {
                      setSelectedDay(day);
                      setShowEmployeeModal(true);
                    }}
                  >
                    <div
                      className={`text-center mb-3 ${isToday ? 'text-purple-600' : 'text-slate-600'}`}
                    >
                      <div className="text-xs font-semibold uppercase">{format(day, 'EEE')}</div>
                      <div className="text-2xl font-bold">{format(day, 'd')}</div>
                    </div>

                    <div className="space-y-2">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                        {dayStats.total > 0 && (
                          <>
                            <div
                              className="bg-green-600 transition-all"
                              style={{
                                width: `${dayStats.total > 0 ? (dayStats.approved / Math.max(dayStats.approved + dayStats.pending, 1)) * 100 : 0}%`,
                              }}
                            />
                            <div
                              className="bg-orange-600 transition-all"
                              style={{
                                width: `${dayStats.total > 0 ? (dayStats.pending / Math.max(dayStats.approved + dayStats.pending, 1)) * 100 : 0}%`,
                              }}
                            />
                          </>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-green-600 font-medium">✓ {dayStats.approved}</span>
                        <span className="text-orange-600 font-medium">⏳ {dayStats.pending}</span>
                      </div>

                      {(dayStats.pendingAmount > 0 || dayStats.approvedAmount > 0) && (
                        <div className="text-xs text-center text-slate-600 pt-1 border-t border-slate-200">
                          {formatCurrency(dayStats.pendingAmount + dayStats.approvedAmount)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {summary && Object.keys(summary.byCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Pending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(summary.byCategory).map(([category, data]) => (
                <div
                  key={category}
                  className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={`${categoryColors[category]} text-white`}>
                      {category.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm text-slate-600">{data.count} claims</span>
                  </div>
                  <div className="text-xl font-bold text-purple-600">
                    {formatCurrency(data.amount)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === 'pending'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending
              <span className="ml-2 px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">
                {allExpenses.filter((exp) => exp.status === 'SUBMITTED').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === 'approved'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved
              <span className="ml-2 px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                {allExpenses.filter((exp) => exp.status === 'APPROVED' || exp.status === 'PAID').length}
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-purple-600" />
            Filter Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label
                htmlFor="employee-filter"
                className="text-sm font-medium text-slate-700 mb-2 block"
              >
                Filter by Employee
              </Label>
              <select
                id="employee-filter"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="all">All Employees</option>
                {getUniqueEmployees().map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="start-date" className="text-sm font-medium text-slate-700 mb-2 block">
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <Label htmlFor="end-date" className="text-sm font-medium text-slate-700 mb-2 block">
                End Date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 flex-wrap">
              {selectedEmployee !== 'all' && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  Employee: {getUniqueEmployees().find((e) => e.id === selectedEmployee)?.name}
                </span>
              )}
              {startDate && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  From: {format(new Date(startDate), 'MMM dd, yyyy')}
                </span>
              )}
              {endDate && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  To: {format(new Date(endDate), 'MMM dd, yyyy')}
                </span>
              )}
              {(selectedEmployee !== 'all' || startDate || endDate) && (
                <span className="text-sm text-slate-600">
                  Showing {expenses.length} of {allExpenses.length} expenses
                </span>
              )}
            </div>
            {(selectedEmployee !== 'all' || startDate || endDate) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            {activeTab === 'pending' ? 'Pending Expense Claims' : 'Approved Expense Claims'} (
            {expenses.length})
          </CardTitle>
          <CardDescription>
            {activeTab === 'pending'
              ? 'Review and approve or reject expense submissions'
              : 'View approved expense claims'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-slate-600 mt-4">Loading expenses...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">All caught up!</h3>
              <p className="text-slate-600">
                There are no {activeTab === 'pending' ? 'pending' : 'approved'} expenses at
                the moment
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold">
                          {expense.user.firstName[0]}
                          {expense.user.lastName[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {expense.user.firstName} {expense.user.lastName}
                          </div>
                          <div className="text-sm text-slate-600">
                            {expense.user.department?.name || 'No Department'} •{' '}
                            {expense.user.employeeId}
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-slate-900">{expense.title}</h3>
                          <Badge className={`${categoryColors[expense.category]} text-white`}>
                            {expense.category.replace('_', ' ')}
                          </Badge>
                          {expense.status === 'APPROVED' && (
                            <Badge className="bg-green-600 text-white">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          )}
                          {expense.status === 'PAID' && (
                            <Badge className="bg-blue-600 text-white">
                              <DollarSign className="h-3 w-3 mr-1" />
                              Paid
                            </Badge>
                          )}
                          <span className="text-xs text-slate-500">#{expense.claimNumber}</span>
                        </div>

                        <p className="text-sm text-slate-600 mb-3">{expense.description}</p>

                        {expense.notes && (
                          <div className="p-2 bg-blue-50 rounded border border-blue-200 text-sm text-blue-900 mb-3">
                            <span className="font-medium">Notes:</span> {expense.notes}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Date: {format(new Date(expense.expenseDate), 'MMM d, yyyy')}
                            </span>
                          </div>
                          {expense.submittedAt && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                Submitted: {format(new Date(expense.submittedAt), 'MMM d, yyyy')}
                              </span>
                            </div>
                          )}
                          {expense.receiptUrls && expense.receiptUrls.length > 0 && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span>{expense.receiptUrls.length} receipt(s)</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  if (expense.receiptUrls && expense.receiptUrls[0]) {
                                    safeOpenUrl(expense.receiptUrls[0]);
                                  }
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row lg:flex-col items-center lg:items-end gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-500 mb-1">Amount</p>
                        <p className="text-2xl md:text-3xl font-bold text-purple-600">
                          {formatCurrency(expense.amount, expense.currency)}
                        </p>
                      </div>

                      <div className="flex flex-row lg:flex-col gap-2">
                        {expense.status === 'SUBMITTED' ? (
                          <>
                            <Button
                              onClick={() => handleApprove(expense.id)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              disabled={approvingId === expense.id || rejectingId === expense.id}
                            >
                              {approvingId === expense.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => handleRejectClick(expense)}
                              variant="outline"
                              size="sm"
                              className="border-red-600 text-red-600 hover:bg-red-50"
                              disabled={approvingId === expense.id || rejectingId === expense.id}
                            >
                              {rejectingId === expense.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </>
                              )}
                            </Button>
                          </>
                        ) : (
                          <div className="text-sm text-slate-600 text-center py-2">
                            {expense.reviewedAt && (
                              <div>
                                Approved on {format(new Date(expense.reviewedAt), 'MMM d, yyyy')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejected Expenses Section */}
      <div id="rejected-expenses-section" className="scroll-mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Rejected Expenses This Week ({rejectedCount})
            </CardTitle>
            <CardDescription>
              Expenses that have been rejected and need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rejectedExpenses.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No rejected expenses this week</p>
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
                            <div className="font-bold text-red-600">
                              {formatCurrency(employee.totalAmount)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {employee.expenses.length} rejected
                            </div>
                          </div>
                          <Badge className="bg-red-100 text-red-700">
                            {selectedRejectedEmployee === employee.userId ? '−' : '+'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Employee Expenses */}
                    {selectedRejectedEmployee === employee.userId && (
                      <div className="border-t border-red-200 p-4 space-y-3 bg-white">
                        {employee.expenses.map((expense) => (
                          <div
                            key={expense.id}
                            className="border border-slate-200 rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <Badge
                                    className={`${categoryColors[expense.category]} text-white`}
                                  >
                                    {expense.category.replace('_', ' ')}
                                  </Badge>
                                  <span className="font-semibold text-red-600">
                                    {formatCurrency(expense.amount, expense.currency)}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    #{expense.claimNumber}
                                  </span>
                                </div>

                                <h4 className="font-medium text-slate-900 mb-1">
                                  {expense.title}
                                </h4>
                                <p className="text-sm text-slate-600 mb-2">
                                  {expense.description}
                                </p>

                                {expense.rejectionReason && (
                                  <div className="p-2 bg-red-50 rounded border border-red-200 text-sm text-red-900 mb-2">
                                    <span className="font-medium">Rejection Reason:</span>{' '}
                                    {expense.rejectionReason}
                                  </div>
                                )}

                                <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                                  <span>
                                    Expense Date: {format(new Date(expense.expenseDate), 'MMM d, yyyy')}
                                  </span>
                                  {expense.rejectedAt && (
                                    <span>
                                      Rejected: {format(new Date(expense.rejectedAt), 'MMM d, yyyy')}
                                    </span>
                                  )}
                                  {expense.rejector && (
                                    <span>
                                      By: {expense.rejector.firstName} {expense.rejector.lastName}
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

      {/* Info Card */}
      <Card className="border-l-4 border-l-blue-600">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Approval Guidelines</h4>
              <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                <li>Verify expense amounts match the receipts provided</li>
                <li>Ensure expenses comply with company policy</li>
                <li>Check that receipts are clear and legible</li>
                <li>Provide clear reasons when rejecting claims</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="bg-red-50">
              <CardTitle className="flex items-center gap-2 text-red-900">
                <XCircle className="h-5 w-5" />
                Reject Expense Claim
              </CardTitle>
              <CardDescription>Provide a reason for rejecting this expense</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {rejectingExpense && (
                <div className="mb-4 p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="text-sm font-medium text-slate-900 mb-1">
                    {rejectingExpense.title}
                  </div>
                  <div className="text-sm text-slate-600">
                    {rejectingExpense.user.firstName} {rejectingExpense.user.lastName} •{' '}
                    {formatCurrency(rejectingExpense.amount, rejectingExpense.currency)}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rejection Reason *
                  </label>
                  <Textarea
                    placeholder="Explain why this expense is being rejected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This reason will be visible to the employee
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleRejectConfirm}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    disabled={!rejectionReason.trim()}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Confirm Rejection
                  </Button>
                  <Button
                    onClick={() => {
                      setShowRejectDialog(false);
                      setRejectingExpense(null);
                      setRejectionReason('');
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Employee Expenses Modal */}
      <Dialog open={showEmployeeModal} onOpenChange={setShowEmployeeModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-purple-600" />
              Expense Submissions - {selectedDay && format(selectedDay, 'MMMM d, yyyy')}
            </DialogTitle>
            <DialogDescription>
              Review and approve expenses for {selectedDay && format(selectedDay, 'EEEE')}
            </DialogDescription>
          </DialogHeader>

          {selectedDay && (
            <div className="space-y-6">
              {/* Pending Expenses */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Pending Approval ({getSubmittedEmployeesForDay(selectedDay).length})
                </h3>

                <div className="space-y-3">
                  {getSubmittedEmployeesForDay(selectedDay).map((employee: any) => (
                    <div key={employee.id} className="border rounded-lg">
                      <div
                        className="p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors flex items-center justify-between"
                        onClick={() =>
                          setSelectedEmployeeId(
                            selectedEmployeeId === employee.id ? null : employee.id
                          )
                        }
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold">
                            {employee.firstName[0]}
                            {employee.lastName[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {employee.firstName} {employee.lastName}
                            </div>
                            <div className="text-sm text-slate-600">
                              {employee.employeeId} • {employee.entries.length} claims •{' '}
                              {formatCurrency(employee.totalAmount)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBulkApprove(employee.id);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                            disabled={approvingId === employee.id}
                          >
                            {approvingId === employee.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve All ({employee.entries.length})
                              </>
                            )}
                          </Button>
                          <Badge className="bg-purple-600">
                            {selectedEmployeeId === employee.id ? '−' : '+'}
                          </Badge>
                        </div>
                      </div>

                      {selectedEmployeeId === employee.id && (
                        <div className="p-4 space-y-3 bg-white">
                          {employee.entries.map((expense: PendingExpense) => (
                            <div
                              key={expense.id}
                              className="border border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <Badge
                                      className={`${categoryColors[expense.category]} text-white`}
                                    >
                                      {expense.category.replace('_', ' ')}
                                    </Badge>
                                    <span className="font-semibold text-purple-600">
                                      {formatCurrency(expense.amount, expense.currency)}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      #{expense.claimNumber}
                                    </span>
                                  </div>

                                  <h4 className="font-medium text-slate-900 mb-1">
                                    {expense.title}
                                  </h4>
                                  <p className="text-sm text-slate-600">{expense.description}</p>

                                  {expense.receiptUrls && expense.receiptUrls.length > 0 && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-slate-400" />
                                      <span className="text-xs text-slate-500">
                                        {expense.receiptUrls.length} receipt(s)
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => {
                                          if (expense.receiptUrls && expense.receiptUrls[0]) {
                                            safeOpenUrl(expense.receiptUrls[0]);
                                          }
                                        }}
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        View
                                      </Button>
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-2 ml-4">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(expense.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                    disabled={approvingId === expense.id}
                                  >
                                    {approvingId === expense.id ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
                                    onClick={() => handleRejectClick(expense)}
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
                      <p>No pending expenses for this day</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Approved Expenses */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Approved ({getApprovedEmployeesForDay(selectedDay).length})
                </h3>

                <div className="space-y-3">
                  {getApprovedEmployeesForDay(selectedDay).map((employee: any) => (
                    <div
                      key={employee.id}
                      className="border border-green-200 bg-green-50 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
                          {employee.firstName[0]}
                          {employee.lastName[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-sm text-slate-600">
                            {employee.employeeId} • {employee.entries.length} approved •{' '}
                            {formatCurrency(employee.totalAmount)}
                          </div>
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />
                      </div>
                    </div>
                  ))}

                  {getApprovedEmployeesForDay(selectedDay).length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>No approved expenses for this day</p>
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
