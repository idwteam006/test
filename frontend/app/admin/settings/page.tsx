'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle,
  Settings as SettingsIcon,
  Globe,
  Clock,
  CalendarClock,
  Receipt,
  CalendarDays,
  Users,
  Calendar
} from 'lucide-react';

interface LeavePolicies {
  ANNUAL: number;
  SICK: number;
  PERSONAL: number;
  MATERNITY: number;
  PATERNITY: number;
  UNPAID: number;
}

interface TenantSettings {
  id: string;
  companyName: string;
  timezone: string;
  timeFormat: string;
  dateFormat: string;
  weekStartDay: string;
  currency: string;
  isDevelopmentMode: boolean;
  allowFutureExpenses: boolean;
  allowFutureTimesheets: boolean;
  allowFutureLeaveRequests: boolean;
  requireLeaveApproval: boolean;
  minimumLeaveNoticeDays: number;
  maximumConsecutiveLeaveDays: number | null;
  allowHalfDayLeave: boolean;
  carryForwardLeave: boolean;
  maxCarryForwardDays: number;
  leaveAllocationDay: string;
  autoAllocateLeave: boolean;
  leavePolicies: LeavePolicies;
  workingHours?: {
    start?: string;
    end?: string;
    days?: number[];
    daysPerWeek?: number;
  } | null;
}

const DEFAULT_LEAVE_POLICIES: LeavePolicies = {
  ANNUAL: 20,
  SICK: 10,
  PERSONAL: 5,
  MATERNITY: 90,
  PATERNITY: 15,
  UNPAID: 0,
};

// Timezone options
const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Toronto', label: 'Toronto' },
  { value: 'America/Vancouver', label: 'Vancouver' },
  { value: 'America/Mexico_City', label: 'Mexico City' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Europe/Rome', label: 'Rome' },
  { value: 'Europe/Madrid', label: 'Madrid' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Asia/Mumbai', label: 'Mumbai' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'China Standard Time' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
  { value: 'Asia/Seoul', label: 'Seoul' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'Australia/Melbourne', label: 'Melbourne' },
  { value: 'Australia/Perth', label: 'Perth' },
  { value: 'Pacific/Auckland', label: 'Auckland' },
  { value: 'Pacific/Honolulu', label: 'Hawaii' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg' },
  { value: 'Africa/Cairo', label: 'Cairo' },
];

const TIME_FORMATS = [
  { value: '12h', label: '12-hour (1:30 PM)' },
  { value: '24h', label: '24-hour (13:30)' },
];

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/06/2025)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (06/12/2025)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-12-06)' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (06-12-2025)' },
  { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY (Dec 06, 2025)' },
];

const WEEK_START_DAYS = [
  { value: 'SUNDAY', label: 'Sunday' },
  { value: 'MONDAY', label: 'Monday' },
  { value: 'SATURDAY', label: 'Saturday' },
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTimeSettings, setSavingTimeSettings] = useState(false);
  const [savingExpenseControl, setSavingExpenseControl] = useState(false);
  const [savingTimesheetControl, setSavingTimesheetControl] = useState(false);
  const [savingLeaveControl, setSavingLeaveControl] = useState(false);
  const [savingLeavePolicy, setSavingLeavePolicy] = useState(false);
  const [settings, setSettings] = useState<TenantSettings | null>(null);

  // Local form state for each section
  const [timeFormData, setTimeFormData] = useState({
    timezone: '',
    timeFormat: '',
    dateFormat: '',
    weekStartDay: ''
  });
  const [leavePolicyFormData, setLeavePolicyFormData] = useState({
    minimumLeaveNoticeDays: 1,
    maximumConsecutiveLeaveDays: null as number | null,
    maxCarryForwardDays: 0,
    leaveAllocationDay: '01-01',
    allowHalfDayLeave: false,
    carryForwardLeave: false,
    autoAllocateLeave: true
  });
  const [leavePoliciesFormData, setLeavePoliciesFormData] = useState<LeavePolicies>(DEFAULT_LEAVE_POLICIES);
  const [savingLeavePolicies, setSavingLeavePolicies] = useState(false);

  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        // Initialize local form state with fetched data
        setTimeFormData({
          timezone: data.settings.timezone,
          timeFormat: data.settings.timeFormat,
          dateFormat: data.settings.dateFormat,
          weekStartDay: data.settings.weekStartDay
        });
        setLeavePolicyFormData({
          minimumLeaveNoticeDays: data.settings.minimumLeaveNoticeDays,
          maximumConsecutiveLeaveDays: data.settings.maximumConsecutiveLeaveDays,
          maxCarryForwardDays: data.settings.maxCarryForwardDays,
          leaveAllocationDay: data.settings.leaveAllocationDay,
          allowHalfDayLeave: data.settings.allowHalfDayLeave,
          carryForwardLeave: data.settings.carryForwardLeave,
          autoAllocateLeave: data.settings.autoAllocateLeave
        });
        setLeavePoliciesFormData(data.settings.leavePolicies || DEFAULT_LEAVE_POLICIES);
      } else {
        console.error('Failed to fetch settings:', data.error);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTimeSettings = async () => {
    if (!settings) return;

    setSavingTimeSettings(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(timeFormData),
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        setSaveMessage({
          type: 'success',
          text: 'Time settings saved successfully'
        });

        // Clear message after 5 seconds
        setTimeout(() => setSaveMessage(null), 5000);
      } else {
        setSaveMessage({
          type: 'error',
          text: data.error || 'Failed to save settings'
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage({
        type: 'error',
        text: 'An error occurred while saving settings'
      });
    } finally {
      setSavingTimeSettings(false);
    }
  };

  const handleToggleDateControl = async (field: 'allowFutureExpenses' | 'allowFutureTimesheets') => {
    if (!settings) return;

    // Set the appropriate loading state based on which field is being toggled
    const setSavingState = field === 'allowFutureExpenses' ? setSavingExpenseControl : setSavingTimesheetControl;

    setSavingState(true);
    setSaveMessage(null);

    const newValue = !settings[field];
    const moduleName = field === 'allowFutureExpenses' ? 'Expenses' : 'Timesheets';

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [field]: newValue
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        setSaveMessage({
          type: 'success',
          text: `${moduleName}: Future date entries ${newValue ? 'enabled' : 'disabled'} successfully`
        });

        // Clear message after 5 seconds
        setTimeout(() => setSaveMessage(null), 5000);
      } else {
        setSaveMessage({
          type: 'error',
          text: data.error || 'Failed to update settings'
        });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      setSaveMessage({
        type: 'error',
        text: 'An error occurred while updating settings'
      });
    } finally {
      setSavingState(false);
    }
  };

  const handleToggleLeaveControl = async (field: keyof TenantSettings) => {
    if (!settings) return;

    setSavingLeaveControl(true);
    setSaveMessage(null);

    const currentValue = settings[field];
    const newValue = typeof currentValue === 'boolean' ? !currentValue : currentValue;

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [field]: newValue
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        setSaveMessage({
          type: 'success',
          text: data.message || 'Leave settings updated successfully'
        });

        setTimeout(() => setSaveMessage(null), 5000);
      } else {
        setSaveMessage({
          type: 'error',
          text: data.error || 'Failed to update settings'
        });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      setSaveMessage({
        type: 'error',
        text: 'An error occurred while updating settings'
      });
    } finally {
      setSavingLeaveControl(false);
    }
  };

  const handleSaveLeavePolicy = async () => {
    if (!settings) return;

    setSavingLeavePolicy(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leavePolicyFormData),
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        setSaveMessage({
          type: 'success',
          text: 'Leave policy saved successfully'
        });

        setTimeout(() => setSaveMessage(null), 5000);
      } else {
        setSaveMessage({
          type: 'error',
          text: data.error || 'Failed to save settings'
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage({
        type: 'error',
        text: 'An error occurred while saving settings'
      });
    } finally {
      setSavingLeavePolicy(false);
    }
  };

  const handleSaveLeavePolicies = async () => {
    if (!settings) return;

    setSavingLeavePolicies(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leavePolicies: leavePoliciesFormData }),
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        setSaveMessage({
          type: 'success',
          text: 'Leave type allocations saved successfully! These will apply to all employees.'
        });

        setTimeout(() => setSaveMessage(null), 5000);
      } else {
        setSaveMessage({
          type: 'error',
          text: data.error || 'Failed to save leave allocations'
        });
      }
    } catch (error) {
      console.error('Error saving leave policies:', error);
      setSaveMessage({
        type: 'error',
        text: 'An error occurred while saving leave allocations'
      });
    } finally {
      setSavingLeavePolicies(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link
                href="/admin/dashboard"
                className="mr-4 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <SettingsIcon className="w-7 h-7 mr-2" />
                  System Settings
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage application configuration and environment settings
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Save Message */}
        {saveMessage && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${
            saveMessage.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            {saveMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
            )}
            <span className={`text-sm font-medium ${
              saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {saveMessage.text}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Organization Info */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Globe className="w-5 h-5 mr-2" />
                  Organization Information
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={settings.companyName}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={settings.currency}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Time & Locale Settings */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Time & Locale Settings
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Configure timezone and date/time display formats for your organization
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🌍 Timezone
                  </label>
                  <select
                    value={timeFormData.timezone}
                    onChange={(e) => setTimeFormData({ ...timeFormData, timezone: e.target.value })}
                    disabled={savingTimeSettings}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    This affects how dates and times are displayed for all users in your organization
                  </p>
                </div>

                {/* Time Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🕐 Time Format
                  </label>
                  <select
                    value={timeFormData.timeFormat}
                    onChange={(e) => setTimeFormData({ ...timeFormData, timeFormat: e.target.value })}
                    disabled={savingTimeSettings}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {TIME_FORMATS.map((tf) => (
                      <option key={tf.value} value={tf.value}>
                        {tf.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📅 Date Format
                  </label>
                  <select
                    value={timeFormData.dateFormat}
                    onChange={(e) => setTimeFormData({ ...timeFormData, dateFormat: e.target.value })}
                    disabled={savingTimeSettings}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {DATE_FORMATS.map((df) => (
                      <option key={df.value} value={df.value}>
                        {df.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Week Start Day */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📆 Week Starts On
                  </label>
                  <select
                    value={timeFormData.weekStartDay}
                    onChange={(e) => setTimeFormData({ ...timeFormData, weekStartDay: e.target.value })}
                    disabled={savingTimeSettings}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {WEEK_START_DAYS.map((wsd) => (
                      <option key={wsd.value} value={wsd.value}>
                        {wsd.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Affects timesheet calendar view and week calculations
                  </p>
                </div>

                {/* Working Hours Display */}
                {settings.workingHours && settings.workingHours.start && settings.workingHours.end && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ⏰ Working Hours
                    </label>
                    <div className="text-sm text-gray-600">
                      <p><strong>Start:</strong> {settings.workingHours.start}</p>
                      <p><strong>End:</strong> {settings.workingHours.end}</p>
                      {settings.workingHours.days && Array.isArray(settings.workingHours.days) ? (
                        <p><strong>Days:</strong> {settings.workingHours.days.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}</p>
                      ) : settings.workingHours.daysPerWeek ? (
                        <p><strong>Days per week:</strong> {settings.workingHours.daysPerWeek}</p>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveTimeSettings}
                    disabled={savingTimeSettings}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {savingTimeSettings ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Time Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Date Entry Controls */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CalendarClock className="w-5 h-5 mr-2" />
                  Date Entry Controls
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Control whether users can add expenses and timesheets for future dates
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Future Expenses Control */}
                <div className="border-2 rounded-lg p-5 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <Receipt className="w-5 h-5 text-blue-600 mr-2" />
                        <h3 className="text-md font-semibold text-gray-900">
                          Future Expense Entries
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {settings.allowFutureExpenses
                          ? '✅ Employees can add expenses for future dates'
                          : '🚫 Employees cannot add expenses for future dates (current and past dates only)'}
                      </p>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>• When <strong>enabled</strong>: Users can create expense entries for any date</p>
                        <p>• When <strong>disabled</strong>: Users can only create expenses for today or past dates</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => handleToggleDateControl('allowFutureExpenses')}
                      disabled={savingExpenseControl}
                      className={`w-full px-5 py-2.5 rounded-lg font-medium flex items-center justify-center transition-all ${
                        settings.allowFutureExpenses
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {savingExpenseControl ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          <span>Updating...</span>
                        </>
                      ) : (
                        <span>
                          {settings.allowFutureExpenses ? 'Disable Future Expenses' : 'Enable Future Expenses'}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Future Timesheets Control */}
                <div className="border-2 rounded-lg p-5 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <Clock className="w-5 h-5 text-purple-600 mr-2" />
                        <h3 className="text-md font-semibold text-gray-900">
                          Future Timesheet Entries
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {settings.allowFutureTimesheets
                          ? '✅ Employees can add timesheets for future dates'
                          : '🚫 Employees cannot add timesheets for future dates (current and past dates only)'}
                      </p>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>• When <strong>enabled</strong>: Users can create timesheet entries for any date</p>
                        <p>• When <strong>disabled</strong>: Users can only create timesheets for today or past dates</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => handleToggleDateControl('allowFutureTimesheets')}
                      disabled={savingTimesheetControl}
                      className={`w-full px-5 py-2.5 rounded-lg font-medium flex items-center justify-center transition-all ${
                        settings.allowFutureTimesheets
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {savingTimesheetControl ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          <span>Updating...</span>
                        </>
                      ) : (
                        <span>
                          {settings.allowFutureTimesheets ? 'Disable Future Timesheets' : 'Enable Future Timesheets'}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Management Settings */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CalendarDays className="w-5 h-5 mr-2" />
                  Leave Management Settings
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Annual, Sick, Personal
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Future Leave Requests Control */}
                <div className="border-2 rounded-lg p-5 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <Calendar className="w-5 h-5 text-green-600 mr-2" />
                        <h3 className="text-md font-semibold text-gray-900">
                          Future Leave Requests
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {settings.allowFutureLeaveRequests
                          ? '✅ Employees can submit leave requests for future dates'
                          : '🚫 Employees cannot submit leave requests for future dates'}
                      </p>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>• When <strong>enabled</strong>: Users can request leave for any future date</p>
                        <p>• When <strong>disabled</strong>: Users can only request leave starting from today</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => handleToggleLeaveControl('allowFutureLeaveRequests')}
                      disabled={savingLeaveControl}
                      className={`w-full px-5 py-2.5 rounded-lg font-medium flex items-center justify-center transition-all ${
                        settings.allowFutureLeaveRequests
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {savingLeaveControl ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          <span>Updating...</span>
                        </>
                      ) : (
                        <span>
                          {settings.allowFutureLeaveRequests ? 'Disable Future Leave Requests' : 'Enable Future Leave Requests'}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Require Leave Approval */}
                <div className="border-2 rounded-lg p-5 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <Users className="w-5 h-5 text-indigo-600 mr-2" />
                        <h3 className="text-md font-semibold text-gray-900">
                          Require Manager Approval
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {settings.requireLeaveApproval
                          ? '✅ Leave requests require manager approval'
                          : '🚫 Leave requests are automatically approved'}
                      </p>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>• When <strong>enabled</strong>: All leave requests must be approved by manager</p>
                        <p>• When <strong>disabled</strong>: Leave requests are auto-approved (not recommended)</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => handleToggleLeaveControl('requireLeaveApproval')}
                      disabled={savingLeaveControl}
                      className={`w-full px-5 py-2.5 rounded-lg font-medium flex items-center justify-center transition-all ${
                        settings.requireLeaveApproval
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {savingLeaveControl ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          <span>Updating...</span>
                        </>
                      ) : (
                        <span>
                          {settings.requireLeaveApproval ? 'Disable Approval Requirement' : 'Enable Approval Requirement'}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Leave Policy Configuration */}
                <div className="border-2 rounded-lg p-5 bg-blue-50">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">📋 Leave Policy Configuration</h3>

                  <div className="space-y-4">
                    {/* Minimum Notice Days */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ⏱️ Minimum Notice Days
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={leavePolicyFormData.minimumLeaveNoticeDays}
                        onChange={(e) => setLeavePolicyFormData({ ...leavePolicyFormData, minimumLeaveNoticeDays: parseInt(e.target.value) })}
                        disabled={savingLeavePolicy}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Employees must request leave at least this many days in advance
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        💡 Real-world: 1-7 days (most companies use 3 days)
                      </p>
                    </div>

                    {/* Maximum Consecutive Days */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📅 Maximum Consecutive Days
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={leavePolicyFormData.maximumConsecutiveLeaveDays || ''}
                        onChange={(e) => setLeavePolicyFormData({ ...leavePolicyFormData, maximumConsecutiveLeaveDays: e.target.value ? parseInt(e.target.value) : null })}
                        disabled={savingLeavePolicy}
                        placeholder="No limit"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum consecutive days allowed per leave request (leave empty for no limit)
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        💡 Real-world: 10-30 days (most companies use 15-21 days)
                      </p>
                    </div>

                    {/* Carry Forward Days */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🔄 Maximum Carry-Forward Days
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={leavePolicyFormData.maxCarryForwardDays}
                        onChange={(e) => setLeavePolicyFormData({ ...leavePolicyFormData, maxCarryForwardDays: parseInt(e.target.value) })}
                        disabled={savingLeavePolicy}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum unused annual leave days that can carry forward to next year
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        💡 Real-world: 5-15 days (most companies use 10 days)
                      </p>
                    </div>

                    {/* Leave Allocation Day */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📆 Annual Allocation Date
                      </label>
                      <input
                        type="text"
                        value={leavePolicyFormData.leaveAllocationDay}
                        onChange={(e) => setLeavePolicyFormData({ ...leavePolicyFormData, leaveAllocationDay: e.target.value })}
                        disabled={savingLeavePolicy}
                        placeholder="MM-DD"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Date when annual leave is allocated each year (format: MM-DD, e.g., 01-01)
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        💡 Real-world: 01-01 (January 1st - calendar year) or 04-01 (April 1st - fiscal year)
                      </p>
                    </div>

                    {/* Toggle Options */}
                    <div className="space-y-3 pt-2">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={leavePolicyFormData.allowHalfDayLeave}
                          onChange={(e) => setLeavePolicyFormData({ ...leavePolicyFormData, allowHalfDayLeave: e.target.checked })}
                          disabled={savingLeavePolicy}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Allow half-day leave requests (0.5 days)
                        </span>
                      </label>

                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={leavePolicyFormData.carryForwardLeave}
                          onChange={(e) => setLeavePolicyFormData({ ...leavePolicyFormData, carryForwardLeave: e.target.checked })}
                          disabled={savingLeavePolicy}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Enable carry-forward of unused annual leave
                        </span>
                      </label>

                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={leavePolicyFormData.autoAllocateLeave}
                          onChange={(e) => setLeavePolicyFormData({ ...leavePolicyFormData, autoAllocateLeave: e.target.checked })}
                          disabled={savingLeavePolicy}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Auto-allocate leave on allocation date
                        </span>
                      </label>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleSaveLeavePolicy}
                        disabled={savingLeavePolicy}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {savingLeavePolicy ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Save Leave Policy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Leave Type Allocations - Organization-wide Settings */}
                <div className="border-2 rounded-lg p-5 bg-green-50">
                  <h3 className="text-md font-semibold text-gray-900 mb-2">Leave Type Allocations (Days per Year)</h3>
                  <p className="text-xs text-gray-600 mb-4">
                    These settings apply to all employees in your organization. No manual allocation needed.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Annual Leave */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🏖️</span>
                        <label className="font-semibold text-blue-600">Annual Leave</label>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={leavePoliciesFormData.ANNUAL}
                        onChange={(e) => setLeavePoliciesFormData({ ...leavePoliciesFormData, ANNUAL: parseInt(e.target.value) || 0 })}
                        disabled={savingLeavePolicies}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Typical: 15-25 days</p>
                    </div>

                    {/* Sick Leave */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🤒</span>
                        <label className="font-semibold text-red-600">Sick Leave</label>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={leavePoliciesFormData.SICK}
                        onChange={(e) => setLeavePoliciesFormData({ ...leavePoliciesFormData, SICK: parseInt(e.target.value) || 0 })}
                        disabled={savingLeavePolicies}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Typical: 7-15 days</p>
                    </div>

                    {/* Personal Leave */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🎯</span>
                        <label className="font-semibold text-purple-600">Personal Leave</label>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={leavePoliciesFormData.PERSONAL}
                        onChange={(e) => setLeavePoliciesFormData({ ...leavePoliciesFormData, PERSONAL: parseInt(e.target.value) || 0 })}
                        disabled={savingLeavePolicies}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Typical: 2-5 days</p>
                    </div>

                    {/* Maternity Leave */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">👶</span>
                        <label className="font-semibold text-pink-600">Maternity Leave</label>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={leavePoliciesFormData.MATERNITY}
                        onChange={(e) => setLeavePoliciesFormData({ ...leavePoliciesFormData, MATERNITY: parseInt(e.target.value) || 0 })}
                        disabled={savingLeavePolicies}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Typical: 60-180 days</p>
                    </div>

                    {/* Paternity Leave */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">👨‍👧</span>
                        <label className="font-semibold text-teal-600">Paternity Leave</label>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={leavePoliciesFormData.PATERNITY}
                        onChange={(e) => setLeavePoliciesFormData({ ...leavePoliciesFormData, PATERNITY: parseInt(e.target.value) || 0 })}
                        disabled={savingLeavePolicies}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Typical: 5-30 days</p>
                    </div>

                    {/* Unpaid Leave */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">💼</span>
                        <label className="font-semibold text-gray-600">Unpaid Leave</label>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={leavePoliciesFormData.UNPAID}
                        onChange={(e) => setLeavePoliciesFormData({ ...leavePoliciesFormData, UNPAID: parseInt(e.target.value) || 0 })}
                        disabled={savingLeavePolicies}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Max allowed (0 = unlimited)</p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded">
                    <p className="text-xs font-medium text-blue-900">How it works</p>
                    <ul className="text-xs text-blue-800 mt-2 space-y-1">
                      <li>• These allocations apply automatically to all employees</li>
                      <li>• No need to manually allocate balances in Balance Management</li>
                      <li>• Employees can immediately request leave up to these limits</li>
                      <li>• Balance Management can be used for individual overrides if needed</li>
                    </ul>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSaveLeavePolicies}
                      disabled={savingLeavePolicies}
                      className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {savingLeavePolicies ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Leave Allocations</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Sidebar - Info */}
          <div className="space-y-6">
            {/* Settings Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">About Settings</p>
                  <p className="mb-2">
                    These settings control how your organization's HR system operates.
                  </p>
                  <p className="font-medium mb-1">Key features:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Time & locale configuration</li>
                    <li>Date entry controls</li>
                    <li>Leave management policies</li>
                    <li>Organization-wide defaults</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Best Practices */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-2">💡 Best Practices</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Configure timezone for your primary office location</li>
                    <li>Set minimum leave notice days (recommended: 3-7 days)</li>
                    <li>Enable leave approval workflow for better control</li>
                    <li>Review and update policies annually</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
