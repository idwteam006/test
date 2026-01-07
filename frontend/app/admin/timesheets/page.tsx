'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  XCircle,
  BarChart3,
  DollarSign,
  CheckCircle2,
  Copy,
  Play,
  Pause,
  Timer,
  AlertTriangle,
  Info,
  Send,
  ClipboardCheck,
  TrendingUp,
  List,
  CalendarDays,
  User,
  Undo2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, addDays, subWeeks, addWeeks, isSameDay, parseISO } from 'date-fns';

/**
 * Format a Date object to YYYY-MM-DD using LOCAL timezone components
 * This ensures dates are always interpreted in the user's local timezone,
 * preventing timezone shifts when storing/comparing dates.
 *
 * @param date - The Date object to format
 * @returns String in "YYYY-MM-DD" format using local timezone
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface TimesheetEntry {
  id: string;
  workDate: string;
  projectId?: string;
  taskId?: string;
  hoursWorked: number;
  description: string;
  isBillable: boolean;
  billingRate?: number;
  billingAmount?: number;
  activityType?: string;
  workType: string;
  status: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  isAutoApproved?: boolean;
  project?: {
    id: string;
    name: string;
    projectCode?: string;
  };
  task?: {
    id: string;
    name: string;
  };
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface Project {
  id: string;
  name: string;
  projectCode?: string;
  status: string;
}

interface Task {
  id: string;
  name: string;
  description?: string;
  status: string;
}

export default function TimesheetsPage() {
  // Enhanced Timesheet with Timer, Charts, Smart Validations, Project/Task Integration, Copy Entry
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);

  // Loading states for actions
  const [savingEntry, setSavingEntry] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [submittingWeek, setSubmittingWeek] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedRejection, setSelectedRejection] = useState<TimesheetEntry | null>(null);

  // Root-level employee auto-approval
  const [isRootLevel, setIsRootLevel] = useState(false);
  const [pendingTimesheets, setPendingTimesheets] = useState(0);
  const [autoApproving, setAutoApproving] = useState(false);

  // Tenant settings for future date control
  const [allowFutureTimesheets, setAllowFutureTimesheets] = useState(false);

  // Projects and Tasks
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Timer state (persisted in localStorage for background operation)
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Form state
  const [formData, setFormData] = useState(() => {
    return {
      workDate: formatLocalDate(new Date()),
      projectId: '',
      taskId: '',
      startTime: '',
      endTime: '',
      breakHours: '0',
      hoursWorked: '',
      description: '',
      activityType: 'Development',
      isBillable: true,
    };
  });

  // Entry mode: 'hours' or 'time'
  const [entryMode, setEntryMode] = useState<'hours' | 'time'>('hours');

  // View mode: 'calendar' or 'list' (default to calendar)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  useEffect(() => {
    fetchEntries();
  }, [currentWeekStart]);

  useEffect(() => {
    fetchProjects();
    checkRootLevelStatus();
    fetchTenantSettings();

    // Load timer state from localStorage on mount (background persistence)
    const savedTimerState = localStorage.getItem('timesheetTimer');
    if (savedTimerState) {
      try {
        const { isRunning, startTime } = JSON.parse(savedTimerState);
        if (isRunning && startTime) {
          setIsTimerRunning(true);
          setTimerStartTime(new Date(startTime));
          // Calculate elapsed time since page refresh
          const elapsed = Math.floor((new Date().getTime() - new Date(startTime).getTime()) / 1000);
          setElapsedSeconds(elapsed);
        }
      } catch (error) {
        console.error('Failed to restore timer state:', error);
        localStorage.removeItem('timesheetTimer');
      }
    }
  }, []);

  // Timer effect (runs in background, persists across page refreshes)
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isTimerRunning) {
      interval = setInterval(() => {
        if (timerStartTime) {
          const elapsed = Math.floor((new Date().getTime() - timerStartTime.getTime()) / 1000);
          setElapsedSeconds(elapsed);
        }
      }, 1000);

      // Save timer state to localStorage for background persistence
      localStorage.setItem(
        'timesheetTimer',
        JSON.stringify({
          isRunning: true,
          startTime: timerStartTime?.toISOString(),
        })
      );
    } else {
      // Clear localStorage when timer stops
      localStorage.removeItem('timesheetTimer');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerStartTime]);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await fetch('/api/employee/projects');
      const data = await response.json();

      if (data.success) {
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchTenantSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();

      if (data.success && data.settings) {
        setAllowFutureTimesheets(data.settings.allowFutureTimesheets || false);
      }
    } catch (error) {
      console.error('Failed to fetch tenant settings:', error);
      // Default to false (blocking future dates) if fetch fails
      setAllowFutureTimesheets(false);
    }
  };

  const checkRootLevelStatus = async () => {
    try {
      const response = await fetch('/api/employee/auto-approve');
      const data = await response.json();

      if (data.success) {
        setIsRootLevel(data.isRootLevel);
        setPendingTimesheets(data.pendingTimesheets || 0);
      }
    } catch (error) {
      console.error('Failed to check root level status:', error);
    }
  };

  const handleAutoApprove = async () => {
    setAutoApproving(true);
    const loadingToast = toast.loading('Auto-approving timesheets...', {
      description: 'Please wait',
    });

    try {
      const response = await fetch('/api/employee/auto-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'timesheets' }),
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(data.message || 'Timesheets auto-approved', {
          description: `${data.results?.timesheetsApproved || 0} timesheet(s) approved`,
        });
        fetchEntries();
        checkRootLevelStatus();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to auto-approve:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to auto-approve timesheets');
    } finally {
      setAutoApproving(false);
    }
  };

  const fetchTasks = async (projectId: string) => {
    if (!projectId) {
      setTasks([]);
      return;
    }

    try {
      setLoadingTasks(true);
      const response = await fetch(`/api/employee/projects/${projectId}/tasks`);
      const data = await response.json();

      if (data.success) {
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setFormData({ ...formData, projectId, taskId: '' });
    fetchTasks(projectId);
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const startDateStr = formatLocalDate(currentWeekStart);
      const endDateStr = formatLocalDate(weekEnd);
      const response = await fetch(
        `/api/employee/timesheets?startDate=${startDateStr}&endDate=${endDateStr}`
      );
      const data = await response.json();

      if (data.success) {
        setEntries(data.entries || []);
      }
    } catch (error) {
      console.error('Failed to fetch entries:', error);
      toast.error('Failed to load timesheet entries');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.hoursWorked || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate work date is not in the future (unless allowed by tenant settings)
    // Use parseISO to correctly parse yyyy-MM-dd without timezone shift
    const workDate = parseISO(formData.workDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (workDate > today && !allowFutureTimesheets) {
      toast.error('Work date cannot be in the future');
      return;
    }

    // Set loading state immediately for button feedback
    setSavingEntry(true);

    // Show loading toast
    const loadingToast = toast.loading('Saving entry...', {
      description: 'Please wait while we save your time entry',
    });

    try {
      const response = await fetch('/api/employee/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workDate: formData.workDate,
          projectId: formData.projectId || null,
          taskId: formData.taskId || null,
          startTime: formData.startTime || null,
          endTime: formData.endTime || null,
          breakHours: parseFloat(formData.breakHours) || 0,
          hoursWorked: parseFloat(formData.hoursWorked),
          description: formData.description,
          activityType: formData.activityType,
          isBillable: formData.isBillable,
          workType: 'REGULAR',
        }),
      });

      const data = await response.json();

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success('Time entry added successfully', {
          description: `${formData.hoursWorked}h logged for ${format(parseISO(formData.workDate), 'MMM d')}`,
        });
        setShowAddModal(false);
        // Reset form with today's date in local timezone
        setFormData({
          workDate: formatLocalDate(new Date()),
          projectId: '',
          taskId: '',
          startTime: '',
          endTime: '',
          breakHours: '0',
          hoursWorked: '',
          description: '',
          activityType: 'Development',
          isBillable: true,
        });
        setTasks([]);
        fetchEntries();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to add entry:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to add time entry');
    } finally {
      setSavingEntry(false);
    }
  };

  const handleDeleteEntry = (id: string) => {
    setEntryToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;

    setShowDeleteConfirm(false);
    setDeletingId(entryToDelete);
    const loadingToast = toast.loading('Deleting entry...', {
      description: 'Please wait',
    });

    try {
      const response = await fetch(`/api/employee/timesheets/${entryToDelete}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success('Entry deleted successfully');
        fetchEntries();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to delete entry:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to delete entry');
    } finally {
      setDeletingId(null);
      setEntryToDelete(null);
    }
  };

  const handleCopyEntry = (entry: TimesheetEntry) => {
    setFormData({
      workDate: formatLocalDate(new Date()),
      projectId: entry.projectId || '',
      taskId: entry.taskId || '',
      startTime: '',
      endTime: '',
      breakHours: '0',
      hoursWorked: entry.hoursWorked.toString(),
      description: entry.description,
      activityType: entry.activityType || 'Development',
      isBillable: entry.isBillable,
    });

    // Load tasks if project is selected
    if (entry.projectId) {
      fetchTasks(entry.projectId);
    }

    setShowAddModal(true);

    toast.success('Entry copied to modal', {
      description: 'Modify the details and save',
    });
  };

  const formatTimer = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    setIsTimerRunning(true);
    setTimerStartTime(new Date());
    setElapsedSeconds(0);
    toast.success('Timer started', {
      description: 'Track your work time',
    });
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    const hours = (elapsedSeconds / 3600).toFixed(2);
    setFormData({ ...formData, hoursWorked: hours });
    setShowAddModal(true);

    toast.success('Timer stopped', {
      description: `${hours} hours logged - fill in the details`,
    });
  };

  const calculateHoursFromTime = (start: string, end: string, breakHours: number = 0) => {
    if (!start || !end) return 0;

    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;

    // Handle overnight shifts
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }

    const totalMinutes = endMinutes - startMinutes;
    const hours = totalMinutes / 60 - breakHours;

    return Math.max(0, hours);
  };

  const handleTimeChange = (field: 'startTime' | 'endTime' | 'breakHours', value: string) => {
    const updated = { ...formData, [field]: value };

    // Auto-calculate hours when both times are set
    if (field === 'startTime' || field === 'endTime' || field === 'breakHours') {
      const hours = calculateHoursFromTime(
        updated.startTime,
        updated.endTime,
        parseFloat(updated.breakHours) || 0
      );
      updated.hoursWorked = hours > 0 ? hours.toFixed(2) : '';
    }

    setFormData(updated);
  };

  const getEntriesForDate = (date: Date) => {
    const dateStr = formatLocalDate(date);
    return entries.filter((e) => {
      // e.workDate is already a string "YYYY-MM-DD" from API
      return e.workDate === dateStr;
    });
  };

  const getTotalHoursForDate = (date: Date) => {
    return getEntriesForDate(date).reduce((sum, e) => sum + e.hoursWorked, 0);
  };

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  // Calculate week totals - memoized to prevent recalculation on every render
  const weekTotals = useMemo(() => ({
    totalHours: entries.reduce((sum, e) => sum + e.hoursWorked, 0),
    billableHours: entries.filter((e) => e.isBillable).reduce((sum, e) => sum + e.hoursWorked, 0),
    nonBillableHours: entries.filter((e) => !e.isBillable).reduce((sum, e) => sum + e.hoursWorked, 0),
    totalAmount: entries.reduce((sum, e) => sum + (e.billingAmount || 0), 0),
  }), [entries]);

  // Activity breakdown for charts - memoized
  const activityBreakdown = useMemo(() => entries.reduce(
    (acc, entry) => {
      const activity = entry.activityType || 'Other';
      acc[activity] = (acc[activity] || 0) + entry.hoursWorked;
      return acc;
    },
    {} as Record<string, number>
  ), [entries]);

  // Project breakdown - memoized
  const projectBreakdown = useMemo(() => entries.reduce(
    (acc, entry) => {
      const projectName = entry.project?.name || 'No Project';
      acc[projectName] = (acc[projectName] || 0) + entry.hoursWorked;
      return acc;
    },
    {} as Record<string, number>
  ), [entries]);

  // Memoized helper function for getting total hours for a date
  const getTotalHoursForDateMemo = useCallback((date: Date) => {
    return getTotalHoursForDate(date);
  }, [entries]);

  // Smart validations - memoized
  const validations = useMemo(() => ({
    overtime: weekTotals.totalHours > 40,
    overtimeHours: Math.max(0, weekTotals.totalHours - 40),
    missingDays: weekDays.filter(
      (day) => !entries.some((e) => isSameDay(new Date(e.workDate), day))
    ),
    highHoursDays: weekDays.filter((day) => getTotalHoursForDate(day) > 12),
  }), [weekTotals.totalHours, weekDays, entries]);

  // Check entry statuses - memoized
  const { submittedEntries, approvedEntries, rejectedEntries, draftEntries } = useMemo(() => ({
    submittedEntries: entries.filter((e) => e.status === 'SUBMITTED'),
    approvedEntries: entries.filter((e) => e.status === 'APPROVED'),
    rejectedEntries: entries.filter((e) => e.status === 'REJECTED'),
    draftEntries: entries.filter((e) => e.status === 'DRAFT'),
  }), [entries]);

  // Determine overall week status - memoized
  const weekStatus = useMemo(() => {
    if (approvedEntries.length === entries.length && entries.length > 0) return 'APPROVED';
    if (rejectedEntries.length > 0) return 'PARTIALLY_REJECTED';
    if (submittedEntries.length > 0) return 'SUBMITTED';
    return 'DRAFT';
  }, [approvedEntries.length, rejectedEntries.length, submittedEntries.length, entries.length]);

  // Check if week can be submitted - memoized
  const canSubmitWeek = useMemo(
    () => entries.length > 0 && entries.every((e) => e.status === 'DRAFT'),
    [entries]
  );
  const weekSubmitted = useMemo(
    () => entries.length > 0 && entries.some((e) => e.status === 'SUBMITTED' || e.status === 'APPROVED'),
    [entries]
  );

  // Can add new entries only if:
  // - No entries exist yet (empty week)
  // - All entries are in DRAFT status (not yet submitted)
  // - There are REJECTED entries (user needs to fix and resubmit)
  // Cannot add if there are any SUBMITTED or APPROVED entries (week is locked)
  const hasSubmittedOrApproved = submittedEntries.length > 0 || approvedEntries.length > 0;
  const canAddEntries = !hasSubmittedOrApproved || rejectedEntries.length > 0;

  const handleSubmitWeek = async () => {
    // Pre-submission validation
    const errors: string[] = [];

    if (entries.length === 0) {
      errors.push('No entries to submit');
    }

    if (weekTotals.totalHours === 0) {
      errors.push('Total hours cannot be zero');
    }

    if (validations.missingDays.length === 7) {
      errors.push('No work days logged this week');
    }

    const invalidEntries = entries.filter((e) => !e.description || e.description.length < 10);
    if (invalidEntries.length > 0) {
      errors.push(`${invalidEntries.length} entries have invalid descriptions`);
    }

    if (errors.length > 0) {
      toast.error('Cannot submit week', {
        description: errors.join('. '),
      });
      return;
    }

    // Show confirmation dialog
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setShowSubmitConfirm(false);
    setSubmittingWeek(true);
    const loadingToast = toast.loading('Submitting week...', {
      description: 'Please wait while we submit your timesheet',
    });

    try {
      // Submit all draft entries
      const entryIds = entries.filter((e) => e.status === 'DRAFT').map((e) => e.id);

      const response = await fetch('/api/employee/timesheets/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryIds,
          weekStart: formatLocalDate(currentWeekStart),
          weekEnd: formatLocalDate(weekEnd),
        }),
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success('Week submitted for approval!', {
          description: `${entryIds.length} entries submitted successfully`,
        });
        fetchEntries();
        // Immediately check root level status to show auto-approval banner
        checkRootLevelStatus();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to submit week:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to submit week');
    } finally {
      setSubmittingWeek(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">My Timesheets</h1>
          <p className="text-sm md:text-base text-slate-600 mt-1">Track your work hours and activities</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Enhanced Timer with Pulse Animation */}
          <Card className={`border-2 transition-all ${
            isTimerRunning
              ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg'
              : 'border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {isTimerRunning && (
                    <motion.div
                      className="absolute inset-0 bg-green-400 rounded-full"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 0, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  )}
                  <Timer className={`h-6 w-6 relative z-10 ${
                    isTimerRunning ? 'text-green-600' : 'text-purple-600'
                  }`} />
                </div>
                <div>
                  <div className="text-xs text-slate-600 font-medium">
                    {isTimerRunning ? '⏱️ Running' : 'Timer'}
                  </div>
                  <div className={`text-2xl md:text-3xl font-bold font-mono ${
                    isTimerRunning ? 'text-green-600' : 'text-purple-600'
                  }`}>
                    {formatTimer(elapsedSeconds)}
                  </div>
                </div>
                {!isTimerRunning ? (
                  <Button
                    onClick={startTimer}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 shadow-md"
                  >
                    <Play className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">Start</span>
                  </Button>
                ) : (
                  <Button
                    onClick={stopTimer}
                    size="sm"
                    variant="destructive"
                    className="shadow-md"
                  >
                    <Pause className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">Stop</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Week Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-purple-600">{weekTotals.totalHours.toFixed(1)}h</div>
            <p className="text-xs text-slate-500 mt-1">This Week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Billable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-green-600">{weekTotals.billableHours.toFixed(1)}h</div>
            <p className="text-xs text-slate-500 mt-1">
              {weekTotals.totalHours > 0
                ? ((weekTotals.billableHours / weekTotals.totalHours) * 100).toFixed(0)
                : 0}
              %
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Non-Billable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-orange-600">{weekTotals.nonBillableHours.toFixed(1)}h</div>
            <p className="text-xs text-slate-500 mt-1">
              {weekTotals.totalHours > 0
                ? ((weekTotals.nonBillableHours / weekTotals.totalHours) * 100).toFixed(0)
                : 0}
              %
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-blue-600">{entries.length}</div>
            <p className="text-xs text-slate-500 mt-1">This Week</p>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Approval Banner for Root Level Employees */}
      {isRootLevel && pendingTimesheets > 0 && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-900">Auto-Approval Available</h3>
                  <p className="text-sm text-amber-700">
                    You have {pendingTimesheets} submitted timesheet(s) ready for auto-approval as a root-level employee.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleAutoApprove}
                disabled={autoApproving}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {autoApproving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve All ({pendingTimesheets})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Week Status - Compact Bar (similar to employee page) */}
      {entries.length > 0 && (
        <div className={`rounded-lg border px-3 py-2 flex items-center justify-between flex-wrap gap-2 ${
          weekStatus === 'APPROVED'
            ? 'border-emerald-200 bg-emerald-50'
            : weekStatus === 'PARTIALLY_REJECTED'
              ? 'border-red-200 bg-red-50'
              : weekStatus === 'SUBMITTED'
                ? 'border-blue-200 bg-blue-50'
                : 'border-slate-200 bg-slate-50'
        }`}>
          {/* Status Info */}
          <div className="flex items-center gap-2">
            {weekStatus === 'APPROVED' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : weekStatus === 'PARTIALLY_REJECTED' ? (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            ) : weekStatus === 'SUBMITTED' ? (
              <Clock className="h-4 w-4 text-blue-600" />
            ) : (
              <Edit2 className="h-4 w-4 text-slate-600" />
            )}
            <span className={`text-sm font-medium ${
              weekStatus === 'APPROVED' ? 'text-emerald-900'
                : weekStatus === 'PARTIALLY_REJECTED' ? 'text-red-900'
                : weekStatus === 'SUBMITTED' ? 'text-blue-900'
                : 'text-slate-900'
            }`}>
              {weekStatus === 'APPROVED' && 'Approved'}
              {weekStatus === 'PARTIALLY_REJECTED' && 'Rejected'}
              {weekStatus === 'SUBMITTED' && 'Under Review'}
              {weekStatus === 'DRAFT' && 'Draft'}
            </span>
            {/* Compact Status Badges */}
            <div className="flex items-center gap-1.5">
              {approvedEntries.length > 0 && (
                <Badge className="bg-emerald-100 text-emerald-800 border-0 text-xs px-1.5 py-0">{approvedEntries.length} ✓</Badge>
              )}
              {submittedEntries.length > 0 && (
                <Badge className="bg-blue-100 text-blue-800 border-0 text-xs px-1.5 py-0">{submittedEntries.length} ⏳</Badge>
              )}
              {rejectedEntries.length > 0 && (
                <Badge className="bg-red-100 text-red-800 border-0 text-xs px-1.5 py-0">{rejectedEntries.length} ✗</Badge>
              )}
              {draftEntries.length > 0 && weekStatus !== 'DRAFT' && (
                <Badge className="bg-slate-100 text-slate-800 border-0 text-xs px-1.5 py-0">{draftEntries.length} draft</Badge>
              )}
            </div>
          </div>

          {/* Submit Button */}
          {draftEntries.length > 0 && (
            <Button onClick={handleSubmitWeek} disabled={submittingWeek} size="sm" className="h-7 bg-primary hover:bg-primary/90 text-white">
              {submittingWeek ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-3 w-3 mr-1" />
                  Submit {draftEntries.length}
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Smart Validations & Alerts */}
      {(validations.overtime || validations.missingDays.length > 0 || validations.highHoursDays.length > 0) && (
        <div className="space-y-3">
          {validations.overtime && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-900">Overtime Alert</AlertTitle>
              <AlertDescription className="text-orange-800">
                You've logged {weekTotals.totalHours.toFixed(1)} hours this week (
                {validations.overtimeHours.toFixed(1)}h overtime). Standard is 40 hours per week.
              </AlertDescription>
            </Alert>
          )}

          {validations.highHoursDays.length > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-900">High Hours Warning</AlertTitle>
              <AlertDescription className="text-yellow-800">
                {validations.highHoursDays.length === 1
                  ? `${format(validations.highHoursDays[0], 'EEEE')} has `
                  : `${validations.highHoursDays.length} days have `}
                more than 12 hours logged. Please review for accuracy.
              </AlertDescription>
            </Alert>
          )}

          {validations.missingDays.length > 0 && validations.missingDays.length < 7 && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900">Missing Entries</AlertTitle>
              <AlertDescription className="text-blue-800">
                No entries for: {validations.missingDays.map((d) => format(d, 'EEE')).join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Activity and Project Breakdown Charts */}
      {entries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Activity Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                Activity Breakdown
              </CardTitle>
              <CardDescription>Hours by activity type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(activityBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([activity, hours]) => (
                    <div key={activity}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{activity}</span>
                        <span className="text-sm font-bold text-purple-600">{hours.toFixed(1)}h</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${(hours / weekTotals.totalHours) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {((hours / weekTotals.totalHours) * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Project Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Project Breakdown
              </CardTitle>
              <CardDescription>Hours by project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(projectBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([project, hours]) => (
                    <div key={project}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{project}</span>
                        <span className="text-sm font-bold text-green-600">{hours.toFixed(1)}h</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${(hours / weekTotals.totalHours) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {((hours / weekTotals.totalHours) * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weekly Grid */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            {/* Title */}
            <div className="text-center lg:text-left">
              <CardTitle>Week View</CardTitle>
              <CardDescription>Your time entries for the week</CardDescription>
            </div>

            {/* Week Navigation and View Toggle - Centered */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {/* Week Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
                  className="h-9"
                >
                  <span className="hidden sm:inline">← Previous</span>
                  <span className="sm:hidden">←</span>
                </Button>
                <div className="text-center min-w-[180px]">
                  <div className="text-sm font-semibold text-slate-900">
                    {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                    className="text-xs text-purple-600 hover:text-purple-700 h-5 px-2"
                  >
                    Today
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
                  className="h-9"
                >
                  <span className="hidden sm:inline">Next →</span>
                  <span className="sm:hidden">→</span>
                </Button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className={`h-8 ${viewMode === 'calendar' ? '' : 'hover:bg-slate-200'}`}
                >
                  <CalendarDays className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Calendar</span>
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`h-8 ${viewMode === 'list' ? '' : 'hover:bg-slate-200'}`}
                >
                  <List className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">List</span>
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 space-y-4">
              {/* Skeleton Loaders */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-200 rounded"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-slate-200 rounded"></div>
                        <div className="h-3 w-20 bg-slate-200 rounded"></div>
                      </div>
                    </div>
                    <div className="h-8 w-24 bg-slate-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === 'calendar' ? (
            /* Calendar View */
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {weekDays.map((day) => {
                const dayEntries = getEntriesForDate(day);
                const dayTotal = getTotalHoursForDate(day);
                const isToday = formatLocalDate(day) === formatLocalDate(new Date());

                return (
                  <motion.div
                    key={day.toISOString()}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`border rounded-lg overflow-hidden ${
                      isToday
                        ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-200'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    } transition-all`}
                  >
                    {/* Calendar Day Header */}
                    <div
                      className={`p-3 border-b ${
                        isToday
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`text-xs font-semibold uppercase ${isToday ? 'text-purple-100' : 'text-slate-600'}`}>
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

                    {/* Calendar Day Content */}
                    <div className="p-3 min-h-[200px] flex flex-col">
                      {/* Total Hours Badge */}
                      {dayTotal > 0 && (
                        <div className="mb-2">
                          <Badge className="w-full justify-center bg-purple-600 text-white border-0">
                            <Clock className="h-3 w-3 mr-1" />
                            {dayTotal.toFixed(1)}h
                          </Badge>
                          {dayTotal > 12 && (
                            <Badge variant="outline" className="w-full justify-center mt-1 text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                              ⚠️ High Hours
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Entries for the day */}
                      <div className="space-y-2 flex-1">
                        {dayEntries.length > 0 ? (
                          dayEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="p-2 rounded-md bg-slate-50 border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-all cursor-pointer group"
                              onClick={() => {
                                // Show entry details on click
                              }}
                            >
                              <div className="flex items-center gap-1 mb-1 flex-wrap">
                                <Badge className="text-[10px] font-bold bg-purple-500 text-white border-0 px-1.5 py-0.5">
                                  {entry.hoursWorked}h
                                </Badge>
                                {entry.isBillable && (
                                  <Badge className="text-[10px] font-semibold bg-green-500 text-white border-0 px-1.5 py-0.5">
                                    💰
                                  </Badge>
                                )}
                                <Badge
                                  className={`text-[10px] font-semibold border-0 px-1.5 py-0.5 ${
                                    entry.status === 'DRAFT'
                                      ? 'bg-amber-100 text-amber-800'
                                      : entry.status === 'SUBMITTED'
                                        ? 'bg-blue-100 text-blue-800'
                                        : entry.status === 'APPROVED'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-red-100 text-red-800 cursor-pointer hover:bg-red-200'
                                  }`}
                                  onClick={(e) => {
                                    if (entry.status === 'REJECTED') {
                                      e.stopPropagation();
                                      setSelectedRejection(entry);
                                      setShowRejectionModal(true);
                                    }
                                  }}
                                  title={entry.status === 'REJECTED' ? 'Click to view rejection details' : ''}
                                >
                                  {entry.status === 'DRAFT' && '📝'}
                                  {entry.status === 'SUBMITTED' && '⏳'}
                                  {entry.status === 'APPROVED' && '✅'}
                                  {entry.status === 'REJECTED' && '❌'}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-700 line-clamp-2 mb-1">{entry.description}</p>
                              {entry.activityType && (
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-medium px-1.5 py-0.5 ${
                                    entry.activityType === 'Development'
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                                      : entry.activityType === 'Meeting'
                                        ? 'bg-orange-50 text-orange-700 border-orange-300'
                                        : entry.activityType === 'Testing'
                                          ? 'bg-pink-50 text-pink-700 border-pink-300'
                                          : 'bg-slate-50 text-slate-700 border-slate-300'
                                  }`}
                                >
                                  {entry.activityType === 'Development' && '💻 '}
                                  {entry.activityType === 'Meeting' && '👥 '}
                                  {entry.activityType === 'Testing' && '🧪 '}
                                  {entry.activityType}
                                </Badge>
                              )}
                              {entry.project && (
                                <div className="mt-1">
                                  <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                                    📁 {entry.project.name}
                                  </Badge>
                                </div>
                              )}
                              <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyEntry(entry);
                                  }}
                                  className="h-6 w-6 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                                  title="Copy entry"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteEntry(entry.id);
                                  }}
                                  disabled={
                                    (entry.status !== 'DRAFT' && entry.status !== 'REJECTED') ||
                                    deletingId === entry.id
                                  }
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                                  title="Delete entry"
                                >
                                  {deletingId === entry.id ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-center py-8">
                            <div>
                              <div className="text-slate-400 mb-2">
                                <Clock className="h-8 w-8 mx-auto opacity-30" />
                              </div>
                              <p className="text-xs text-slate-400">No entries</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Add Entry Button - disabled for future dates (unless allowed) and submitted weeks */}
                      {(() => {
                        const todayDate = new Date();
                        todayDate.setHours(0, 0, 0, 0);
                        const dayStart = new Date(day);
                        dayStart.setHours(0, 0, 0, 0);
                        const isFutureDate = dayStart > todayDate;
                        const isDisabled = (isFutureDate && !allowFutureTimesheets) || !canAddEntries;
                        const disabledReason = (isFutureDate && !allowFutureTimesheets) ? 'Future Date' : !canAddEntries ? 'Week Submitted' : '';

                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormData({ ...formData, workDate: formatLocalDate(day) });
                              setShowAddModal(true);
                            }}
                            disabled={isDisabled}
                            className={`w-full mt-2 border-dashed ${
                              isDisabled
                                ? 'border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                                : 'border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400'
                            }`}
                            title={isDisabled ? (isFutureDate ? 'Cannot add entries for future dates' : 'Cannot add entries - week has been submitted') : 'Add time entry'}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {disabledReason || 'Add Entry'}
                          </Button>
                        );
                      })()}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="space-y-4">
              {weekDays.map((day) => {
                const dayEntries = getEntriesForDate(day);
                const dayTotal = getTotalHoursForDate(day);
                const isToday = formatLocalDate(day) === formatLocalDate(new Date());

                return (
                  <div
                    key={day.toISOString()}
                    className={`border rounded-lg p-4 ${isToday ? 'border-purple-300 bg-purple-50/50' : 'border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`text-center ${isToday ? 'text-purple-600' : 'text-slate-600'}`}>
                          <div className="text-sm font-medium">{format(day, 'EEE')}</div>
                          <div className="text-2xl font-bold">{format(day, 'd')}</div>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{format(day, 'MMMM d, yyyy')}</div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-slate-600">
                              {dayTotal > 0 ? `${dayTotal.toFixed(1)} hours` : 'No entries'}
                            </div>
                            {dayTotal > 12 && (
                              <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                                ⚠️ High
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {(() => {
                        const todayDate = new Date();
                        todayDate.setHours(0, 0, 0, 0);
                        const dayStart = new Date(day);
                        dayStart.setHours(0, 0, 0, 0);
                        const isFutureDate = dayStart > todayDate;
                        const isDisabled = (isFutureDate && !allowFutureTimesheets) || !canAddEntries;
                        const disabledReason = (isFutureDate && !allowFutureTimesheets) ? 'Future' : !canAddEntries ? 'Locked' : '';

                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormData({ ...formData, workDate: formatLocalDate(day) });
                              setShowAddModal(true);
                            }}
                            disabled={isDisabled}
                            title={isDisabled ? (isFutureDate ? 'Cannot add entries for future dates' : 'Cannot add entries - week has been submitted') : 'Add time entry'}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {disabledReason || 'Add'}
                          </Button>
                        );
                      })()}
                    </div>

                    {dayEntries.length > 0 && (
                      <div className="space-y-2">
                        {dayEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-start justify-between p-3 bg-white rounded-md border border-slate-200 hover:border-slate-300 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center flex-wrap gap-2 mb-2">
                                {/* Hours Badge - Large and prominent */}
                                <Badge className="text-xs font-bold bg-purple-600 text-white border-0 px-2.5 py-1">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {entry.hoursWorked}h
                                </Badge>

                                {/* Status Badge */}
                                <Badge
                                  className={`text-xs font-semibold border-0 px-2.5 py-1 ${
                                    entry.status === 'DRAFT'
                                      ? 'bg-amber-100 text-amber-800'
                                      : entry.status === 'SUBMITTED'
                                        ? 'bg-blue-100 text-blue-800'
                                        : entry.status === 'APPROVED'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-red-100 text-red-800 cursor-pointer hover:bg-red-200'
                                  }`}
                                  onClick={(e) => {
                                    if (entry.status === 'REJECTED') {
                                      e.stopPropagation();
                                      setSelectedRejection(entry);
                                      setShowRejectionModal(true);
                                    }
                                  }}
                                  title={entry.status === 'REJECTED' ? 'Click to view rejection details' : ''}
                                >
                                  {entry.status === 'DRAFT' && '📝 '}
                                  {entry.status === 'SUBMITTED' && '⏳ '}
                                  {entry.status === 'APPROVED' && '✅ '}
                                  {entry.status === 'REJECTED' && '❌ '}
                                  {entry.status}
                                </Badge>

                                {/* Billable Badge */}
                                {entry.isBillable ? (
                                  <Badge className="text-xs font-semibold bg-green-600 text-white border-0 px-2.5 py-1">
                                    💰 Billable
                                  </Badge>
                                ) : (
                                  <Badge className="text-xs font-semibold bg-slate-500 text-white border-0 px-2.5 py-1">
                                    Non-billable
                                  </Badge>
                                )}

                                {/* Activity Type Badge */}
                                {entry.activityType && (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs font-medium px-2.5 py-1 ${
                                      entry.activityType === 'Development'
                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                                        : entry.activityType === 'Meeting'
                                          ? 'bg-orange-50 text-orange-700 border-orange-300'
                                          : entry.activityType === 'Testing'
                                            ? 'bg-pink-50 text-pink-700 border-pink-300'
                                            : entry.activityType === 'Documentation'
                                              ? 'bg-cyan-50 text-cyan-700 border-cyan-300'
                                              : 'bg-slate-50 text-slate-700 border-slate-300'
                                    }`}
                                  >
                                    {entry.activityType === 'Development' && '💻 '}
                                    {entry.activityType === 'Meeting' && '👥 '}
                                    {entry.activityType === 'Testing' && '🧪 '}
                                    {entry.activityType === 'Documentation' && '📄 '}
                                    {entry.activityType === 'Review' && '👀 '}
                                    {entry.activityType}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-700 line-clamp-2 mb-1">{entry.description}</p>
                              {entry.project && (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                                    📁 {entry.project.name}
                                    {entry.project.projectCode && ` (${entry.project.projectCode})`}
                                  </Badge>
                                  {entry.task && (
                                    <Badge variant="outline" className="text-xs bg-teal-50 text-teal-700 border-teal-200">
                                      🎯 {entry.task.name}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyEntry(entry)}
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                title="Copy entry"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteEntry(entry.id)}
                                disabled={
                                  (entry.status !== 'DRAFT' && entry.status !== 'REJECTED') ||
                                  deletingId === entry.id
                                }
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {deletingId === entry.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile Quick Actions Bar - Sticky at bottom on mobile */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-slate-200 shadow-lg z-40 safe-area-inset-bottom">
        <div className="flex items-center justify-around p-3 max-w-lg mx-auto">
          {!isTimerRunning ? (
            <Button
              size="sm"
              onClick={startTimer}
              className="flex-1 mx-1 bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-1" />
              Start Timer
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={stopTimer}
              variant="destructive"
              className="flex-1 mx-1"
            >
              <Pause className="h-4 w-4 mr-1" />
              Stop Timer
            </Button>
          )}

          {canSubmitWeek && !weekSubmitted && entries.length > 0 && (
            <Button
              size="sm"
              onClick={handleSubmitWeek}
              disabled={submittingWeek}
              className="flex-1 mx-1 bg-purple-600 hover:bg-purple-700"
            >
              {submittingWeek ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                  <span className="hidden sm:inline">Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Submit
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Add padding at bottom on mobile to prevent content being hidden by quick actions bar */}
      <div className="h-20 lg:hidden"></div>

      {/* Submit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={handleConfirmSubmit}
        title="Submit Timesheet"
        message={`Submit ${entries.length} entries (${weekTotals.totalHours.toFixed(1)} hours) for approval?\n\nOnce submitted, you cannot edit these entries.`}
        confirmText="Submit for Approval"
        cancelText="Cancel"
        variant="warning"
        isLoading={submittingWeek}
      />

      {/* Delete Entry Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setEntryToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Entry"
        message="Are you sure you want to delete this timesheet entry?\n\nThis action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletingId !== null}
      />

      {/* Add/Edit Time Entry Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-purple-600" />
              Add Time Entry
            </DialogTitle>
            <DialogDescription>
              Add a new time entry for {formData.workDate && format(parseISO(formData.workDate), 'MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddEntry} className="space-y-4">
            {/* Entry Mode Toggle */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Label className="text-sm font-medium">Entry Method:</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={entryMode === 'hours' ? 'default' : 'outline'}
                  onClick={() => setEntryMode('hours')}
                >
                  Hours
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={entryMode === 'time' ? 'default' : 'outline'}
                  onClick={() => setEntryMode('time')}
                >
                  Start/End Time
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="modal-workDate">Date *</Label>
                <Input
                  id="modal-workDate"
                  type="date"
                  value={formData.workDate}
                  max={allowFutureTimesheets ? undefined : formatLocalDate(new Date())}
                  onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  {allowFutureTimesheets ? 'Select any date' : 'Cannot be a future date'}
                </p>
              </div>

              {entryMode === 'hours' ? (
                <div>
                  <Label htmlFor="modal-hoursWorked">Hours Worked *</Label>
                  <Input
                    id="modal-hoursWorked"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    placeholder="8.0"
                    value={formData.hoursWorked}
                    onChange={(e) => setFormData({ ...formData, hoursWorked: e.target.value })}
                    required
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="modal-breakHours">Break Hours</Label>
                  <Input
                    id="modal-breakHours"
                    type="number"
                    step="0.5"
                    min="0"
                    max="4"
                    placeholder="0.5"
                    value={formData.breakHours}
                    onChange={(e) => handleTimeChange('breakHours', e.target.value)}
                  />
                </div>
              )}
            </div>

            {entryMode === 'time' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="modal-startTime">Start Time *</Label>
                  <Input
                    id="modal-startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleTimeChange('startTime', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="modal-endTime">End Time *</Label>
                  <Input
                    id="modal-endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleTimeChange('endTime', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label className="text-sm text-slate-600">Calculated Hours</Label>
                  <div className="h-10 flex items-center px-3 bg-slate-100 rounded-md font-semibold text-purple-600">
                    {formData.hoursWorked || '0'} hours
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="modal-project">Project</Label>
                <select
                  id="modal-project"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formData.projectId}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  disabled={loadingProjects}
                >
                  <option value="">Select Project (Optional)</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} {project.projectCode && `(${project.projectCode})`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="modal-task">Task</Label>
                <select
                  id="modal-task"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  value={formData.taskId}
                  onChange={(e) => setFormData({ ...formData, taskId: e.target.value })}
                  disabled={!formData.projectId || loadingTasks}
                >
                  <option value="">
                    {!formData.projectId
                      ? 'Select project first'
                      : loadingTasks
                        ? 'Loading tasks...'
                        : 'Select Task (Optional)'}
                  </option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="modal-activityType">Activity Type</Label>
              <select
                id="modal-activityType"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={formData.activityType}
                onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
              >
                <option>Development</option>
                <option>Testing</option>
                <option>Meeting</option>
                <option>Code Review</option>
                <option>Documentation</option>
                <option>Bug Fixing</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <Label htmlFor="modal-description">Description * (Min 10 characters)</Label>
              <Textarea
                id="modal-description"
                placeholder="Describe what you worked on..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                required
                minLength={10}
              />
              <p className="text-xs text-slate-500 mt-1">{formData.description.length} characters</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="modal-isBillable"
                checked={formData.isBillable}
                onChange={(e) => setFormData({ ...formData, isBillable: e.target.checked })}
                className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
              />
              <Label htmlFor="modal-isBillable" className="cursor-pointer">
                Billable
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={savingEntry}>
                {savingEntry ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Entry
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                disabled={savingEntry}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rejection Details Modal */}
      <Dialog
        open={showRejectionModal}
        onOpenChange={(open) => {
          setShowRejectionModal(open);
          if (!open) {
            setSelectedRejection(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Timesheet Entry Rejected
            </DialogTitle>
            <DialogDescription>
              This entry was rejected and needs to be corrected before resubmission
            </DialogDescription>
          </DialogHeader>

          {selectedRejection && (
            <div className="space-y-4 py-4">
              {/* Entry Details */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <Calendar className="h-5 w-5 text-slate-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700">Work Date</div>
                    <div className="text-base text-slate-900">
                      {format(new Date(selectedRejection.workDate), 'EEEE, MMMM d, yyyy')}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <Clock className="h-5 w-5 text-slate-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700">Hours Worked</div>
                    <div className="text-base text-slate-900 font-semibold">
                      {selectedRejection.hoursWorked}h
                      {selectedRejection.isBillable && (
                        <Badge className="ml-2 text-xs bg-green-100 text-green-700 border-0">
                          Billable
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {selectedRejection.project && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="h-5 w-5 text-slate-500 mt-0.5">📁</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-700">Project</div>
                      <div className="text-base text-slate-900">
                        {selectedRejection.project.name}
                        {selectedRejection.project.projectCode && (
                          <span className="text-sm text-slate-500 ml-2">
                            ({selectedRejection.project.projectCode})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {selectedRejection.activityType && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="h-5 w-5 text-slate-500 mt-0.5">
                      {selectedRejection.activityType === 'Development' && '💻'}
                      {selectedRejection.activityType === 'Meeting' && '👥'}
                      {selectedRejection.activityType === 'Testing' && '🧪'}
                      {selectedRejection.activityType === 'Code Review' && '🔍'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-700">Activity Type</div>
                      <div className="text-base text-slate-900">{selectedRejection.activityType}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="h-5 w-5 text-slate-500 mt-0.5">📝</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700">Description</div>
                    <div className="text-base text-slate-900">{selectedRejection.description}</div>
                  </div>
                </div>
              </div>

              {/* Rejection Reason - Highlighted */}
              <div className="p-4 rounded-lg bg-red-50 border-2 border-red-200">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-red-900 mb-1">Rejection Reason</div>
                    <div className="text-base text-red-800 leading-relaxed">
                      {selectedRejection.rejectionReason || 'No reason provided'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Instructions */}
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Next Steps:</strong> This entry is now in DRAFT status. You can edit it to address the rejection reason, then resubmit it for approval.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectionModal(false);
                setSelectedRejection(null);
              }}
            >
              Close
            </Button>
            {selectedRejection && (
              <Button
                onClick={() => {
                  setShowRejectionModal(false);
                  setEditingEntry(selectedRejection);
                  setSelectedRejection(null);
                  setShowAddModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Edit Entry
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
