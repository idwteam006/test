'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Plus,
  DollarSign,
  Calendar,
  FileText,
  CheckCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Edit,
  Trash2,
  AlertCircle,
  Send,
  CalendarRange,
  List as ListIcon,
  User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addWeeks,
  subWeeks,
  parseISO,
} from 'date-fns';
import ExpenseFormModal from '@/components/expenses/ExpenseFormModal';
import { CATEGORY_COLORS, STATUS_CONFIG } from '@/lib/expense-constants';

interface Expense {
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
  rejectionReason?: string;
  rejectedAt?: string;
  notes?: string;
  rejector?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

// Use centralized constants for colors and status config
const categoryColors = CATEGORY_COLORS;
const statusConfig = STATUS_CONFIG;

export default function EmployeeExpensesPage() {
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [viewMode, setViewMode] = useState<'weekly' | 'list'>('weekly');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submittingAll, setSubmittingAll] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [expenseToSubmit, setExpenseToSubmit] = useState<string | null>(null);
  const [showSubmitAllConfirm, setShowSubmitAllConfirm] = useState(false);

  // Root-level employee auto-approval
  const [isRootLevel, setIsRootLevel] = useState(false);
  const [pendingExpenses, setPendingExpenses] = useState(0);
  const [autoApproving, setAutoApproving] = useState(false);

  // Tenant settings for future date control
  const [allowFutureExpenses, setAllowFutureExpenses] = useState(false);

  // Rejected expenses
  const [rejectedExpenses, setRejectedExpenses] = useState<Expense[]>([]);
  const [showRejectedSection, setShowRejectedSection] = useState(false);

  // Week calculations (Monday to Sunday)
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    fetchExpenses();
    fetchRejectedExpenses();
    checkRootLevelStatus();
    fetchTenantSettings();
  }, [currentWeek, viewMode]);

  const fetchTenantSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();

      if (data.success && data.settings) {
        setAllowFutureExpenses(data.settings.allowFutureExpenses || false);
      }
    } catch (error) {
      console.error('Failed to fetch tenant settings:', error);
      // Default to false (blocking future dates) if fetch fails
      setAllowFutureExpenses(false);
    }
  };

  const checkRootLevelStatus = async () => {
    try {
      const response = await fetch('/api/employee/auto-approve');
      const data = await response.json();

      if (data.success) {
        setIsRootLevel(data.isRootLevel);
        setPendingExpenses(data.pendingExpenses || 0);
      }
    } catch (error) {
      console.error('Failed to check root level status:', error);
    }
  };

  const handleAutoApprove = async () => {
    setAutoApproving(true);
    const loadingToast = toast.loading('Auto-approving expenses...', {
      description: 'Please wait',
    });

    try {
      const response = await fetch('/api/employee/auto-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'expenses' }),
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(data.message || 'Expenses auto-approved', {
          description: `${data.results?.expensesApproved || 0} expense(s) approved`,
        });
        fetchExpenses();
        checkRootLevelStatus();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to auto-approve:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to auto-approve expenses');
    } finally {
      setAutoApproving(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);

      // Use week range for fetching expenses
      const startDate = weekStart.toISOString().split('T')[0];
      const endDate = weekEnd.toISOString().split('T')[0];

      const response = await fetch(`/api/employee/expenses?startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();

      if (data.success) {
        setExpenses(data.expenses || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to fetch expenses:', error);
      toast.error(error.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchRejectedExpenses = async () => {
    try {
      const startDate = weekStart.toISOString().split('T')[0];
      const endDate = weekEnd.toISOString().split('T')[0];

      const response = await fetch(`/api/employee/expenses/rejected?startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();

      if (data.success) {
        setRejectedExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error('Failed to fetch rejected expenses:', error);
    }
  };

  const stats = {
    total: expenses.length,
    pending: expenses.filter(e => e.status === 'SUBMITTED').length,
    approved: expenses.filter(e => e.status === 'APPROVED' || e.status === 'PAID').length,
    rejected: rejectedExpenses.length,
    rejectedAmount: rejectedExpenses.reduce((sum, e) => sum + e.amount, 0),
    totalAmount: expenses
      .filter(e => e.status !== 'REJECTED' && e.status !== 'DRAFT')
      .reduce((sum, e) => sum + e.amount, 0),
  };

  const handleCreateExpense = () => {
    setEditingExpense(null);
    setSelectedDate(null); // Use today's date when clicking general "Add" button
    setShowExpenseForm(true);
  };

  const handleEditExpense = (expense: Expense) => {
    // Only allow editing DRAFT or REJECTED expenses
    if (expense.status === 'SUBMITTED') {
      toast.error('Cannot edit submitted expense', {
        description: 'This expense is pending approval and cannot be modified.',
      });
      return;
    }
    if (expense.status === 'APPROVED' || expense.status === 'PAID') {
      toast.error('Cannot edit approved expense', {
        description: 'This expense has been approved and cannot be modified.',
      });
      return;
    }
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleDeleteExpense = (expenseId: string) => {
    // Check if expense can be deleted
    const expense = expenses.find((e) => e.id === expenseId);
    if (expense) {
      if (expense.status === 'SUBMITTED') {
        toast.error('Cannot delete submitted expense', {
          description: 'This expense is pending approval and cannot be deleted.',
        });
        return;
      }
      if (expense.status === 'APPROVED' || expense.status === 'PAID') {
        toast.error('Cannot delete approved expense', {
          description: 'This expense has been approved and cannot be deleted.',
        });
        return;
      }
    }
    setExpenseToDelete(expenseId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;

    setShowDeleteConfirm(false);
    setDeletingId(expenseToDelete);

    try {
      const response = await fetch(`/api/employee/expenses/${expenseToDelete}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Expense deleted successfully');
        fetchExpenses();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to delete expense:', error);
      toast.error(error.message || 'Failed to delete expense');
    } finally {
      setDeletingId(null);
      setExpenseToDelete(null);
    }
  };

  // Show confirmation before submitting single expense
  const handleSubmitExpense = (expenseId: string) => {
    setExpenseToSubmit(expenseId);
    setShowSubmitConfirm(true);
  };

  // Actually submit single expense after confirmation
  const handleConfirmSubmitExpense = async () => {
    if (!expenseToSubmit) return;

    setShowSubmitConfirm(false);
    setSubmittingId(expenseToSubmit);

    try {
      const response = await fetch(`/api/employee/expenses/${expenseToSubmit}/submit`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Expense submitted for approval');
        fetchExpenses();
        // Refresh root level status for auto-approval button
        setTimeout(() => checkRootLevelStatus(), 100);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to submit expense:', error);
      toast.error(error.message || 'Failed to submit expense');
    } finally {
      setSubmittingId(null);
      setExpenseToSubmit(null);
    }
  };

  // Show confirmation before submitting all drafts
  const handleSubmitAllDrafts = () => {
    const draftExpenses = expenses.filter(e => e.status === 'DRAFT');

    if (draftExpenses.length === 0) {
      toast.error('No draft expenses to submit');
      return;
    }

    setShowSubmitAllConfirm(true);
  };

  // Actually submit all draft expenses after confirmation
  const handleConfirmSubmitAll = async () => {
    setShowSubmitAllConfirm(false);
    const draftExpenses = expenses.filter(e => e.status === 'DRAFT');

    setSubmittingAll(true);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const expense of draftExpenses) {
        try {
          const response = await fetch(`/api/employee/expenses/${expense.id}/submit`, {
            method: 'POST',
          });
          const data = await response.json();

          if (data.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} expense(s) submitted for approval`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} expense(s) failed to submit`);
      }

      fetchExpenses();
      // Refresh root level status for auto-approval button
      setTimeout(() => checkRootLevelStatus(), 100);
    } catch (error: any) {
      console.error('Failed to submit expenses:', error);
      toast.error(error.message || 'Failed to submit expenses');
    } finally {
      setSubmittingAll(false);
    }
  };

  // Get draft count for submit all button
  const draftCount = expenses.filter(e => e.status === 'DRAFT').length;

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getExpensesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return expenses.filter((e) => {
      // Extract date string without timezone conversion
      const expenseDateStr = e.expenseDate as string;
      const entryDateStr = expenseDateStr.includes('T')
        ? expenseDateStr.split('T')[0]
        : expenseDateStr;
      return entryDateStr === dateStr;
    });
  };

  const getTotalForDate = (date: Date) => {
    return getExpensesForDate(date).reduce((sum, e) => sum + e.amount, 0);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          My Expenses
        </h1>
        <p className="text-slate-600 mt-2">
          Submit and track your business expense claims
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-purple-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-purple-600">{stats.total}</div>
              <Briefcase className="h-8 w-8 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-blue-600">{stats.pending}</div>
              <Clock className="h-8 w-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
              <CheckCircle className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-l-4 border-l-red-600 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => {
            const section = document.getElementById('rejected-expenses-section');
            section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
              <XCircle className="h-8 w-8 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(stats.totalAmount)}
              </div>
              <DollarSign className="h-8 w-8 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle and Navigation */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Expense Claims
              </CardTitle>
              <CardDescription>
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Navigation Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                >
                  ←
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentWeek(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                >
                  →
                </Button>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <Button
                  variant={viewMode === 'weekly' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('weekly')}
                  className={viewMode === 'weekly' ? '' : 'hover:bg-slate-200'}
                >
                  <CalendarRange className="h-4 w-4 mr-1" />
                  Weekly
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? '' : 'hover:bg-slate-200'}
                >
                  <ListIcon className="h-4 w-4 mr-1" />
                  List
                </Button>
              </div>

              {/* Submit All Drafts Button */}
              {draftCount > 0 && (
                <Button
                  onClick={handleSubmitAllDrafts}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={submittingAll}
                >
                  {submittingAll ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Submit Week ({draftCount})
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-slate-600 mt-4">Loading expenses...</p>
            </div>
          ) : viewMode === 'weekly' ? (
            /* Weekly View */
            <div>
              {/* Week Summary */}
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Week Summary</h3>
                    <p className="text-sm text-slate-600">
                      {format(weekStart, 'EEEE, MMM d')} - {format(weekEnd, 'EEEE, MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{expenses.length}</p>
                      <p className="text-xs text-slate-500">Expenses</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}
                      </p>
                      <p className="text-xs text-slate-500">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-600">{draftCount}</p>
                      <p className="text-xs text-slate-500">Drafts</p>
                    </div>
                    {/* Submit Week Button */}
                    {draftCount > 0 && (
                      <Button
                        onClick={handleSubmitAllDrafts}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md"
                        disabled={submittingAll}
                      >
                        {submittingAll ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Submitting Week...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Submit Week ({draftCount} draft{draftCount > 1 ? 's' : ''})
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Weekly Grid */}
              <div className="grid grid-cols-7 gap-3">
                {daysInWeek.map((day) => {
                  const dayExpenses = getExpensesForDate(day);
                  const dayTotal = getTotalForDate(day);
                  const isToday = isSameDay(day, new Date());
                  const dayDrafts = dayExpenses.filter(e => e.status === 'DRAFT').length;

                  return (
                    <motion.div
                      key={day.toISOString()}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`border rounded-lg overflow-hidden flex flex-col min-h-[300px] ${
                        isToday
                          ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-200'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      } transition-all`}
                    >
                      {/* Date Header */}
                      <div className={`p-3 border-b ${
                        isToday
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500'
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="text-center">
                          <div className={`text-xs font-semibold uppercase ${isToday ? 'text-purple-100' : 'text-slate-500'}`}>
                            {format(day, 'EEE')}
                          </div>
                          <div className={`text-2xl font-bold ${isToday ? 'text-white' : 'text-slate-900'}`}>
                            {format(day, 'd')}
                          </div>
                          <div className={`text-xs ${isToday ? 'text-purple-100' : 'text-slate-500'}`}>
                            {format(day, 'MMM')}
                          </div>
                        </div>
                      </div>

                      {/* Day Content */}
                      <div className="p-2 flex-1 flex flex-col">
                        {/* Day Total */}
                        {dayTotal > 0 && (
                          <div className="mb-2">
                            <Badge className="w-full justify-center bg-purple-600 text-white border-0">
                              <DollarSign className="h-3 w-3 mr-1" />
                              {formatCurrency(dayTotal)}
                            </Badge>
                          </div>
                        )}

                        {/* Expenses List */}
                        <div className="flex-1 space-y-2 overflow-y-auto mb-2">
                          {dayExpenses.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">No expenses</p>
                          ) : (
                            dayExpenses.map((expense) => (
                              <div
                                key={expense.id}
                                className="p-2 rounded-md bg-slate-50 border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-all cursor-pointer"
                                onClick={() => handleEditExpense(expense)}
                              >
                                <div className="flex items-center gap-1 mb-1 flex-wrap">
                                  <Badge className={`${categoryColors[expense.category]} text-white text-[10px] px-1.5 py-0.5`}>
                                    {expense.category.slice(0, 3)}
                                  </Badge>
                                  <Badge
                                    className={`text-[10px] font-semibold border-0 px-1.5 py-0.5 ${statusConfig[expense.status]?.bgColor} ${statusConfig[expense.status]?.textColor}`}
                                    aria-label={`Status: ${statusConfig[expense.status]?.label}`}
                                  >
                                    <span className="font-bold mr-0.5">{statusConfig[expense.status]?.icon}</span>
                                  </Badge>
                                </div>
                                <p className="text-xs font-medium text-slate-700 line-clamp-1">{expense.title}</p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs font-bold text-purple-600">
                                    {formatCurrency(expense.amount)}
                                  </span>
                                  {expense.status === 'DRAFT' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 px-1 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteExpense(expense.id);
                                      }}
                                      disabled={deletingId === expense.id}
                                    >
                                      {deletingId === expense.id ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add Expense Button - disabled for future dates (unless allowed by tenant settings) */}
                        {(() => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const dayStart = new Date(day);
                          dayStart.setHours(0, 0, 0, 0);
                          const isFutureDate = dayStart > today;
                          const isDisabled = isFutureDate && !allowFutureExpenses;

                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              className={`w-full border-dashed transition-all text-xs ${
                                isDisabled
                                  ? 'border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                                  : 'border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400'
                              }`}
                              onClick={() => {
                                setEditingExpense(null);
                                setSelectedDate(day);
                                setShowExpenseForm(true);
                              }}
                              disabled={isDisabled}
                              title={isDisabled ? 'Cannot add expenses for future dates' : `Add expense for ${format(day, 'MMM d')}`}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {isDisabled ? 'Future' : 'Add'}
                            </Button>
                          );
                        })()}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* List View */
            <div className="space-y-4">
              {expenses.map((expense) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-slate-900">{expense.title}</h3>
                        <Badge className={`${categoryColors[expense.category]} text-white`}>
                          {expense.category.replace('_', ' ')}
                        </Badge>
                        <Badge className={`${statusConfig[expense.status]?.bgColor} ${statusConfig[expense.status]?.textColor}`}>
                          {statusConfig[expense.status]?.label || expense.status}
                        </Badge>
                        <span className="text-xs text-slate-500">#{expense.claimNumber}</span>
                      </div>

                      <p className="text-sm text-slate-600 mb-3">{expense.description}</p>

                      <div className="flex items-center gap-4 text-sm text-slate-600 mb-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Date: {format(parseISO(expense.expenseDate.includes('T') ? expense.expenseDate.split('T')[0] : expense.expenseDate), 'MMM d, yyyy')}</span>
                        </div>
                        {expense.submittedAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Submitted: {format(new Date(expense.submittedAt), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                        {expense.receiptUrls && expense.receiptUrls.length > 0 && (
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            <span>{expense.receiptUrls.length} receipt(s)</span>
                          </div>
                        )}
                      </div>

                      {expense.status === 'REJECTED' && expense.rejectionReason && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-sm">
                          <div className="flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-red-900 mb-1">Rejection Reason:</p>
                              <p className="text-red-700">{expense.rejectionReason}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-500 mb-1">Amount</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatCurrency(expense.amount, expense.currency)}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        {expense.status === 'DRAFT' && (
                          <>
                            <Button
                              onClick={() => handleEditExpense(expense)}
                              variant="outline"
                              size="sm"
                              className="border-purple-600 text-purple-600 hover:bg-purple-50"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              onClick={() => handleDeleteExpense(expense.id)}
                              variant="outline"
                              size="sm"
                              className="border-red-600 text-red-600 hover:bg-red-50"
                              disabled={deletingId === expense.id}
                            >
                              {deletingId === expense.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </>
                              )}
                            </Button>
                          </>
                        )}
                        {expense.status === 'REJECTED' && (
                          <>
                            <Button
                              onClick={() => handleEditExpense(expense)}
                              variant="outline"
                              size="sm"
                              className="border-purple-600 text-purple-600 hover:bg-purple-50"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit & Resubmit
                            </Button>
                          </>
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

      {/* Auto-Approval for Root Level Employees */}
      {isRootLevel && pendingExpenses > 0 && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-900">Auto-Approval Available</h3>
                  <p className="text-sm text-amber-700">
                    As a root-level employee (no manager), you can auto-approve your {pendingExpenses} submitted expense(s).
                  </p>
                </div>
              </div>
              <Button
                onClick={handleAutoApprove}
                disabled={autoApproving}
                className="bg-amber-600 hover:bg-amber-700 text-white shadow-md"
              >
                {autoApproving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Auto-Approve ({pendingExpenses})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejected Expenses Section */}
      <div id="rejected-expenses-section" className="scroll-mt-8">
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-5 w-5" />
                  Rejected Expenses ({stats.rejected})
                </CardTitle>
                <CardDescription>
                  These expenses have been rejected and need your attention
                </CardDescription>
              </div>
              {stats.rejected > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRejectedSection(!showRejectedSection)}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  {showRejectedSection ? 'Hide Details' : 'Show Details'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {stats.rejected === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-30 text-green-500" />
                <p>No rejected expenses this week</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Summary */}
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-medium text-red-900">Total Rejected Amount</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.rejectedAmount)}</p>
                    </div>
                    <div className="h-10 w-px bg-red-200" />
                    <div>
                      <p className="text-sm font-medium text-red-900">Expenses</p>
                      <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                    </div>
                  </div>
                  <p className="text-sm text-red-700">Click to edit and resubmit</p>
                </div>

                {/* Expanded List */}
                {(showRejectedSection || stats.rejected <= 3) && (
                  <div className="space-y-3">
                    {rejectedExpenses.map((expense) => (
                      <motion.div
                        key={expense.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-white border border-red-200 rounded-lg hover:border-red-400 transition-all cursor-pointer"
                        onClick={() => handleEditExpense(expense)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="font-semibold text-slate-900">{expense.title}</h3>
                              <Badge className={`${categoryColors[expense.category]} text-white`}>
                                {expense.category.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-slate-500">#{expense.claimNumber}</span>
                            </div>

                            <p className="text-sm text-slate-600 mb-2">{expense.description}</p>

                            {expense.rejectionReason && (
                              <div className="p-2 bg-red-50 rounded border border-red-200 text-sm mb-2">
                                <div className="flex items-start gap-2">
                                  <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-medium text-red-900">Rejection Reason:</p>
                                    <p className="text-red-700">{expense.rejectionReason}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                              <span>
                                Expense Date: {format(parseISO(expense.expenseDate.includes('T') ? expense.expenseDate.split('T')[0] : expense.expenseDate), 'MMM d, yyyy')}
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

                          <div className="text-right">
                            <p className="text-2xl font-bold text-red-600">
                              {formatCurrency(expense.amount, expense.currency)}
                            </p>
                            <Button
                              size="sm"
                              className="mt-2 bg-purple-600 hover:bg-purple-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditExpense(expense);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit & Resubmit
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
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
              <h4 className="font-semibold text-slate-900 mb-1">Expense Policy Reminder</h4>
              <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                <li>All expenses must be submitted within 30 days of the transaction date</li>
                <li>Attaching receipts is recommended for better record keeping</li>
                <li>Travel expenses require prior approval from your manager</li>
                <li>Approved expenses are typically reimbursed within 7-10 business days</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Form Modal */}
      <ExpenseFormModal
        isOpen={showExpenseForm}
        onClose={() => {
          setShowExpenseForm(false);
          setEditingExpense(null);
          setSelectedDate(null);
        }}
        onSuccess={fetchExpenses}
        expense={editingExpense}
        initialDate={selectedDate}
        allowFutureExpenses={allowFutureExpenses}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setExpenseToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Expense"
        message="Are you sure you want to delete this expense claim? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletingId !== null}
      />

      {/* Submit Single Expense Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => {
          setShowSubmitConfirm(false);
          setExpenseToSubmit(null);
        }}
        onConfirm={handleConfirmSubmitExpense}
        title="Submit Expense"
        message="Submit this expense for approval?\n\n⚠️ Once submitted, you cannot edit or delete this expense until it is reviewed."
        confirmText="Submit for Approval"
        cancelText="Cancel"
        variant="warning"
        isLoading={submittingId !== null}
      />

      {/* Submit All Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSubmitAllConfirm}
        onClose={() => setShowSubmitAllConfirm(false)}
        onConfirm={handleConfirmSubmitAll}
        title="Submit All Expenses"
        message={`Submit ${expenses.filter(e => e.status === 'DRAFT').length} expense(s) for approval?\n\n⚠️ Once submitted, you cannot edit or delete these expenses until they are reviewed.`}
        confirmText="Submit for Approval"
        cancelText="Cancel"
        variant="warning"
        isLoading={submittingAll}
      />
    </div>
  );
}
