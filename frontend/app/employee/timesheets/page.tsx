'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
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
  List,
  CalendarDays,
  Undo2,
  User,
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
import { formatLocalDate } from '@/lib/date-utils';

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
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());

  // Loading states for actions
  const [savingEntry, setSavingEntry] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [requestingEditId, setRequestingEditId] = useState<string | null>(null);
  const [submittingWeek, setSubmittingWeek] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  // Recent submissions (across all dates)
  const [recentSubmissions, setRecentSubmissions] = useState<TimesheetEntry[]>([]);

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
  const [formData, setFormData] = useState({
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
    fetchRecentSubmissions();
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

  // Fetch recent submissions (SUBMITTED status across all dates - last 30 days)
  const fetchRecentSubmissions = async () => {
    try {
      // Fetch last 30 days of entries to find recent submissions
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const response = await fetch(
        `/api/employee/timesheets?startDate=${formatLocalDate(thirtyDaysAgo)}&endDate=${formatLocalDate(new Date())}&status=SUBMITTED`
      );
      const data = await response.json();

      if (data.success) {
        // Filter only SUBMITTED entries
        const submitted = (data.entries || []).filter((e: TimesheetEntry) => e.status === 'SUBMITTED');
        setRecentSubmissions(submitted);
      }
    } catch (error) {
      console.error('Failed to fetch recent submissions:', error);
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
      // Use formatLocalDate to get YYYY-MM-DD in local timezone
      // This prevents date shifts in different timezones (e.g., Dec 8 becoming Dec 7 in PST)
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
        // Add the new entry to the state immediately for instant UI update
        if (data.entry) {
          setEntries((prevEntries) => [...prevEntries, data.entry]);
        }

        toast.success('Time entry added successfully', {
          description: `${formData.hoursWorked}h logged for ${format(parseISO(formData.workDate), 'MMM d')}`,
        });
        setShowAddModal(false);
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

        // Also fetch entries to ensure sync with backend
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
    // Check if entry can be deleted
    const entry = entries.find((e) => e.id === id);
    if (entry) {
      if (entry.status === 'SUBMITTED') {
        toast.error('Cannot delete submitted entry', {
          description: 'This entry is pending approval and cannot be deleted.',
        });
        return;
      }
      if (entry.status === 'APPROVED') {
        toast.error('Cannot delete approved entry', {
          description: 'This entry has been approved and cannot be deleted.',
        });
        return;
      }
    }
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

  const handleRequestEdit = async (entryId: string) => {
    setRequestingEditId(entryId);
    const loadingToast = toast.loading('Reverting to draft...', {
      description: 'Please wait',
    });

    try {
      const response = await fetch(`/api/employee/timesheets/${entryId}/request-edit`, {
        method: 'POST',
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success('Entry reverted to draft', {
          description: 'You can now edit and resubmit this entry',
        });
        fetchEntries();
        fetchRecentSubmissions();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to request edit:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to revert entry');
    } finally {
      setRequestingEditId(null);
    }
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
    // Use formatLocalDate for timezone-safe date formatting
    // This ensures the date stays in local timezone without UTC conversion
    const dateStr = formatLocalDate(date);

    // Use parseISO to correctly parse the ISO date string without timezone conversion
    // This prevents dates from shifting due to local timezone differences
    return entries.filter((e) => {
      // Extract just the date part (YYYY-MM-DD) from the ISO string to avoid timezone issues
      // workDate comes from the API as a string in ISO format
      const workDateStr = e.workDate as string;
      const entryDateStr = workDateStr.includes('T')
        ? workDateStr.split('T')[0]
        : workDateStr;
      return entryDateStr === dateStr;
    });
  };

  const getTotalHoursForDate = (date: Date) => {
    return getEntriesForDate(date).reduce((sum, e) => sum + e.hoursWorked, 0);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Calculate week totals
  const weekTotals = {
    totalHours: entries.reduce((sum, e) => sum + e.hoursWorked, 0),
    billableHours: entries.filter((e) => e.isBillable).reduce((sum, e) => sum + e.hoursWorked, 0),
    nonBillableHours: entries.filter((e) => !e.isBillable).reduce((sum, e) => sum + e.hoursWorked, 0),
    totalAmount: entries.reduce((sum, e) => sum + (e.billingAmount || 0), 0),
  };

  // Activity breakdown for charts
  const activityBreakdown = entries.reduce(
    (acc, entry) => {
      const activity = entry.activityType || 'Other';
      acc[activity] = (acc[activity] || 0) + entry.hoursWorked;
      return acc;
    },
    {} as Record<string, number>
  );

  const projectBreakdown = entries.reduce(
    (acc, entry) => {
      const projectName = entry.project?.name || 'No Project';
      acc[projectName] = (acc[projectName] || 0) + entry.hoursWorked;
      return acc;
    },
    {} as Record<string, number>
  );

  // Helper to compare entry workDate with a day without timezone conversion
  const isEntryOnDay = (entryWorkDate: string, day: Date): boolean => {
    const dayStr = formatLocalDate(day);
    const workDateStr = entryWorkDate as string;
    const entryDateStr = workDateStr.includes('T')
      ? workDateStr.split('T')[0]
      : workDateStr;
    return entryDateStr === dayStr;
  };

  // Smart validations
  const validations = {
    overtime: weekTotals.totalHours > 40,
    overtimeHours: Math.max(0, weekTotals.totalHours - 40),
    missingDays: weekDays.filter(
      (day) => !entries.some((e) => isEntryOnDay(e.workDate, day))
    ),
    highHoursDays: weekDays.filter((day) => getTotalHoursForDate(day) > 12),
  };

  // Check if week can be submitted
  const canSubmitWeek = entries.length > 0 && entries.every((e) => e.status === 'DRAFT');
  const weekSubmitted = entries.length > 0 && entries.some((e) => e.status === 'SUBMITTED' || e.status === 'APPROVED' || e.status === 'REJECTED');

  // Check week status more granularly
  const submittedEntries = entries.filter((e) => e.status === 'SUBMITTED');
  const approvedEntries = entries.filter((e) => e.status === 'APPROVED');
  const rejectedEntries = entries.filter((e) => e.status === 'REJECTED');
  const draftEntries = entries.filter((e) => e.status === 'DRAFT');

  // Determine overall week status
  const weekStatus = approvedEntries.length === entries.length && entries.length > 0
    ? 'APPROVED'
    : rejectedEntries.length > 0
      ? 'PARTIALLY_REJECTED'
      : submittedEntries.length > 0
        ? 'SUBMITTED'
        : 'DRAFT';

  // Can add new entries only if:
  // - No entries exist yet (empty week)
  // - All entries are in DRAFT status (not yet submitted)
  // - There are REJECTED entries (user needs to fix and resubmit)
  // Cannot add if there are any SUBMITTED or APPROVED entries (week is locked)
  const hasSubmittedOrApproved = submittedEntries.length > 0 || approvedEntries.length > 0;
  const canAddEntries = !hasSubmittedOrApproved || rejectedEntries.length > 0;

  // Selection handlers
  const handleToggleSelect = (entryId: string) => {
    const newSelected = new Set(selectedEntryIds);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntryIds(newSelected);
  };

  const handleSelectAll = () => {
    const draftAndRejectedEntries = entries.filter(
      (e) => e.status === 'DRAFT' || e.status === 'REJECTED'
    );
    if (selectedEntryIds.size === draftAndRejectedEntries.length) {
      setSelectedEntryIds(new Set());
    } else {
      setSelectedEntryIds(new Set(draftAndRejectedEntries.map((e) => e.id)));
    }
  };

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

  const handleSubmitSelected = async () => {
    if (selectedEntryIds.size === 0) {
      toast.error('No entries selected');
      return;
    }

    // Validate selected entries
    const selectedEntries = entries.filter((e) => selectedEntryIds.has(e.id));
    const invalidEntries = selectedEntries.filter(
      (e) => !e.description || e.description.length < 10
    );

    if (invalidEntries.length > 0) {
      toast.error('Cannot submit', {
        description: `${invalidEntries.length} selected entries have invalid descriptions`,
      });
      return;
    }

    // Show confirmation dialog
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setShowSubmitConfirm(false);
    setSubmittingWeek(true);

    // Determine which entries to submit
    const entryIds =
      selectedEntryIds.size > 0
        ? Array.from(selectedEntryIds)
        : entries.filter((e) => e.status === 'DRAFT' || e.status === 'REJECTED').map((e) => e.id);

    const loadingToast = toast.loading(
      selectedEntryIds.size > 0 ? 'Submitting selected entries...' : 'Submitting week...',
      {
        description: `Please wait while we submit ${entryIds.length} entries`,
      }
    );

    try {
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
        toast.success('Submitted successfully!', {
          description: `${entryIds.length} entries submitted for approval`,
        });
        // Clear selection
        setSelectedEntryIds(new Set());
        // Refresh entries to show updated status
        await fetchEntries();
        await fetchRecentSubmissions();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to submit:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to submit');
    } finally {
      setSubmittingWeek(false);
    }
  };

  return (
    <div className="p-4 space-y-3">
      {/* Header with Timer and Stats - Compact Single Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Timesheets</h1>
            <p className="text-xs text-slate-500">Track your work hours</p>
          </div>
          {/* Compact Timer */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
            isTimerRunning
              ? 'border-green-300 bg-green-50'
              : 'border-purple-200 bg-purple-50'
          }`}>
            <Timer className={`h-4 w-4 ${isTimerRunning ? 'text-green-600' : 'text-purple-600'}`} />
            <span className={`text-lg font-bold font-mono ${isTimerRunning ? 'text-green-600' : 'text-purple-600'}`}>
              {formatTimer(elapsedSeconds)}
            </span>
            {!isTimerRunning ? (
              <Button onClick={startTimer} size="sm" className="h-6 px-2 bg-green-600 hover:bg-green-700">
                <Play className="h-3 w-3" />
              </Button>
            ) : (
              <Button onClick={stopTimer} size="sm" variant="destructive" className="h-6 px-2">
                <Pause className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Compact Week Stats - Inline */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-purple-600" />
            <span className="font-bold text-purple-600">{weekTotals.totalHours.toFixed(1)}h</span>
            <span className="text-slate-400">total</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-green-600">{weekTotals.billableHours.toFixed(1)}h</span>
            <span className="text-slate-400">billable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-orange-600">{weekTotals.nonBillableHours.toFixed(1)}h</span>
            <span className="text-slate-400">non-bill</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-blue-600">{entries.length}</span>
            <span className="text-slate-400">entries</span>
          </div>
        </div>
      </div>

      {/* Week Status - Compact Bar */}
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
          {canSubmitWeek && (
            <Button onClick={handleSubmitWeek} disabled={submittingWeek} size="sm" className="h-7 bg-primary hover:bg-primary/90 text-white">
              {submittingWeek ? (
                <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>Submitting...</>
              ) : (
                <><Send className="h-3 w-3 mr-1" />Submit Week</>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Recent Submissions Summary - Shows submitted entries pending approval */}
      {recentSubmissions.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Recent Submissions ({recentSubmissions.length} pending approval)
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Group by week and show navigation buttons */}
            {(() => {
              // Group submissions by their week start date
              const weekGroups: Record<string, TimesheetEntry[]> = {};
              recentSubmissions.forEach((entry) => {
                // Extract date string without timezone conversion
                const workDateStr = entry.workDate as string;
                const dateStr = workDateStr.includes('T')
                  ? workDateStr.split('T')[0]
                  : workDateStr;
                const entryDate = parseISO(dateStr);
                const weekStart = startOfWeek(entryDate, { weekStartsOn: 1 });
                const weekKey = formatLocalDate(weekStart);
                if (!weekGroups[weekKey]) {
                  weekGroups[weekKey] = [];
                }
                weekGroups[weekKey].push(entry);
              });

              return Object.entries(weekGroups)
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .slice(0, 4) // Show max 4 weeks
                .map(([weekKey, weekEntries]) => {
                  const weekStart = parseISO(weekKey);
                  const weekEndDate = endOfWeek(weekStart, { weekStartsOn: 1 });
                  const totalHours = weekEntries.reduce((sum, e) => sum + e.hoursWorked, 0);
                  const isCurrentViewWeek = formatLocalDate(currentWeekStart) === weekKey;

                  return (
                    <Button
                      key={weekKey}
                      variant={isCurrentViewWeek ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentWeekStart(weekStart)}
                      className={`h-auto py-1.5 px-3 text-xs ${
                        isCurrentViewWeek
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'border-blue-300 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">
                          {format(weekStart, 'MMM d')} - {format(weekEndDate, 'MMM d')}
                        </span>
                        <span className="text-[10px] opacity-80">
                          {weekEntries.length} entries ({totalHours.toFixed(1)}h)
                        </span>
                      </div>
                    </Button>
                  );
                });
            })()}
          </div>
        </div>
      )}

      {/* Compact Alerts Row */}
      {(validations.overtime || validations.missingDays.length > 0 || validations.highHoursDays.length > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {validations.overtime && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-100 text-orange-800 border border-orange-200">
              <AlertTriangle className="h-3 w-3" />
              Overtime: {validations.overtimeHours.toFixed(1)}h over 40h
            </span>
          )}
          {validations.highHoursDays.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-100 text-yellow-800 border border-yellow-200">
              <AlertTriangle className="h-3 w-3" />
              {validations.highHoursDays.length} day(s) with 12h+
            </span>
          )}
          {validations.missingDays.length > 0 && validations.missingDays.length < 7 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
              <Info className="h-3 w-3" />
              Missing: {validations.missingDays.map((d) => format(d, 'EEE')).join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Activity & Project Breakdown - Compact Inline */}
      {entries.length > 0 && (Object.keys(activityBreakdown).length > 0 || Object.keys(projectBreakdown).length > 0) && (
        <div className="flex flex-wrap gap-4 text-xs">
          {/* Activity Tags */}
          {Object.keys(activityBreakdown).length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 flex items-center gap-1"><BarChart3 className="h-3 w-3" />Activity:</span>
              {Object.entries(activityBreakdown)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([activity, hours]) => (
                  <span key={activity} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                    {activity} <strong>{hours.toFixed(1)}h</strong>
                  </span>
                ))}
            </div>
          )}
          {/* Project Tags */}
          {Object.keys(projectBreakdown).length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 flex items-center gap-1"><DollarSign className="h-3 w-3" />Project:</span>
              {Object.entries(projectBreakdown)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([project, hours]) => (
                  <span key={project} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {project} <strong>{hours.toFixed(1)}h</strong>
                  </span>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Weekly Grid */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Week Navigation - Compact */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="h-7 px-2">←</Button>
              <div className="text-center">
                <span className="text-sm font-semibold text-slate-900">{format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                  className="text-xs text-purple-600 hover:text-purple-700 h-5 px-2 ml-1"
                >
                  Today
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="h-7 px-2">→</Button>
            </div>

            {/* View Mode Toggle - Compact */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className={`h-6 px-2 text-xs ${viewMode === 'calendar' ? '' : 'hover:bg-slate-200'}`}
              >
                <CalendarDays className="h-3 w-3 mr-1" />
                Calendar
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={`h-6 px-2 text-xs ${viewMode === 'list' ? '' : 'hover:bg-slate-200'}`}
              >
                <List className="h-3 w-3 mr-1" />
                List
              </Button>
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
                                          : 'bg-red-100 text-red-800'
                                  }`}
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
                              {/* Approval/Rejection Info */}
                              {entry.status === 'APPROVED' && (
                                <div className="mt-1 text-[10px] text-green-700 flex items-center gap-1">
                                  <User className="h-2.5 w-2.5" />
                                  {entry.isAutoApproved ? (
                                    <span>Self-approved</span>
                                  ) : entry.approver ? (
                                    <span>by {entry.approver.firstName}</span>
                                  ) : (
                                    <span>Approved</span>
                                  )}
                                </div>
                              )}
                              {entry.status === 'REJECTED' && entry.rejectionReason && (
                                <div className="mt-1 text-[10px] text-red-700 line-clamp-1" title={entry.rejectionReason}>
                                  Reason: {entry.rejectionReason}
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
                                {/* Request Edit button for SUBMITTED entries */}
                                {entry.status === 'SUBMITTED' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRequestEdit(entry.id);
                                    }}
                                    disabled={requestingEditId === entry.id}
                                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                                    title="Revert to draft for editing"
                                  >
                                    {requestingEditId === entry.id ? (
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                    ) : (
                                      <Undo2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                )}
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

                      {/* Add Entry Button - disabled for future dates (unless allowed) or when week is submitted */}
                      {(() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dayStart = new Date(day);
                        dayStart.setHours(0, 0, 0, 0);
                        const isFutureDate = dayStart > today;
                        const isDisabled = (isFutureDate && !allowFutureTimesheets) || !canAddEntries;
                        const disabledReason = (isFutureDate && !allowFutureTimesheets)
                          ? 'Cannot add entries for future dates'
                          : !canAddEntries
                            ? 'Week already submitted'
                            : 'Add time entry';

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
                            title={disabledReason}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {(isFutureDate && !allowFutureTimesheets) ? 'Future' : !canAddEntries ? 'Locked' : 'Add'}
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
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dayStart = new Date(day);
                        dayStart.setHours(0, 0, 0, 0);
                        const isFutureDate = dayStart > today;
                        const isDisabled = (isFutureDate && !allowFutureTimesheets) || !canAddEntries;

                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormData({ ...formData, workDate: formatLocalDate(day) });
                              setShowAddModal(true);
                            }}
                            disabled={isDisabled}
                            title={(isFutureDate && !allowFutureTimesheets) ? 'Cannot add entries for future dates' : !canAddEntries ? 'Week already submitted' : 'Add time entry'}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {(isFutureDate && !allowFutureTimesheets) ? 'Future' : !canAddEntries ? 'Locked' : 'Add'}
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
                                          : 'bg-red-100 text-red-800'
                                  }`}
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
                              {/* Approval/Rejection Info */}
                              {entry.status === 'APPROVED' && (
                                <div className="flex items-center gap-2 mt-2 text-xs text-green-700">
                                  <User className="h-3 w-3" />
                                  {entry.isAutoApproved ? (
                                    <span>Self-approved</span>
                                  ) : entry.approver ? (
                                    <span>Approved by {entry.approver.firstName} {entry.approver.lastName}</span>
                                  ) : (
                                    <span>Approved</span>
                                  )}
                                  {entry.approvedAt && (
                                    <span className="text-slate-500">
                                      on {format(new Date(entry.approvedAt), 'MMM d, yyyy')}
                                    </span>
                                  )}
                                </div>
                              )}
                              {entry.status === 'REJECTED' && entry.rejectionReason && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                  <span className="font-medium">Rejection reason:</span> {entry.rejectionReason}
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
                              {/* Request Edit button for SUBMITTED entries */}
                              {entry.status === 'SUBMITTED' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRequestEdit(entry.id)}
                                  disabled={requestingEditId === entry.id}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  title="Revert to draft for editing"
                                >
                                  {requestingEditId === entry.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                  ) : (
                                    <Undo2 className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
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
        message={`Submit ${entries.length} entries (${weekTotals.totalHours.toFixed(1)} hours) for approval?\n\n⚠️ Once submitted, you cannot edit or delete these entries until they are reviewed.`}
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
    </div>
  );
}
