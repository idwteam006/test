'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Info,
  Upload,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatLocalDate, calculateWorkingDays, getDateRangeWithStatus } from '@/lib/date-utils';

interface LeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  medicalCertificateUrl?: string | null;
  status: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

interface LeaveBalance {
  id: string;
  leaveType: string;
  balance: number;
  year: number;
}

interface TenantSettings {
  minimumLeaveNoticeDays: number;
  maximumConsecutiveLeaveDays: number | null;
  allowFutureLeaveRequests: boolean;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
}

export default function EmployeeLeavePage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayDates, setHolidayDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const [formData, setFormData] = useState({
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [medicalCertificate, setMedicalCertificate] = useState<File | null>(null);

  useEffect(() => {
    fetchLeaveRequests();
    fetchBalances();
    fetchSettings();
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const response = await fetch(`/api/employee/leave/holidays?year=${currentYear}`);
      const data = await response.json();

      if (data.success) {
        setHolidays(data.holidays || []);
        setHolidayDates(data.mandatoryHolidayDates || []);
      }
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/employee/leave');
      const data = await response.json();

      if (data.success) {
        setLeaveRequests(data.leaveRequests || []);
      }
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchBalances = async () => {
    try {
      const response = await fetch('/api/employee/leave/balance');
      const data = await response.json();

      if (data.success) {
        setBalances(data.balances || []);
      }
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();

      if (data.success) {
        setSettings({
          minimumLeaveNoticeDays: data.settings.minimumLeaveNoticeDays,
          maximumConsecutiveLeaveDays: data.settings.maximumConsecutiveLeaveDays,
          allowFutureLeaveRequests: data.settings.allowFutureLeaveRequests,
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.startDate || !formData.endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (end < start) {
      toast.error('End date must be after start date');
      return;
    }

    // Calculate working days (excluding weekends AND holidays)
    const days = calculateWorkingDays(formData.startDate, formData.endDate, holidayDates);

    if (days === 0) {
      toast.error('Selected dates fall on weekends or holidays only. Please select working days.');
      return;
    }

    const loadingToast = toast.loading('Submitting leave request...', {
      description: 'Please wait',
    });

    try {
      let response;

      // Use FormData if medical certificate is uploaded, otherwise use JSON
      if (medicalCertificate) {
        const formDataToSend = new FormData();
        formDataToSend.append('leaveType', formData.leaveType);
        formDataToSend.append('startDate', formData.startDate);
        formDataToSend.append('endDate', formData.endDate);
        formDataToSend.append('reason', formData.reason);
        formDataToSend.append('days', days.toString());
        formDataToSend.append('medicalCertificate', medicalCertificate);

        response = await fetch('/api/employee/leave', {
          method: 'POST',
          body: formDataToSend,
        });
      } else {
        response = await fetch('/api/employee/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            days,
          }),
        });
      }

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success('Leave request submitted!', {
          description: `${days} days of ${formData.leaveType.toLowerCase()} leave requested`,
        });
        setShowRequestForm(false);
        setFormData({
          leaveType: 'ANNUAL',
          startDate: '',
          endDate: '',
          reason: '',
        });
        setMedicalCertificate(null);
        fetchLeaveRequests();
        fetchBalances();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to submit request:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to submit leave request');
    }
  };

  const handleCancelRequest = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;

    const loadingToast = toast.loading('Cancelling request...', {
      description: 'Please wait',
    });

    try {
      const response = await fetch(`/api/employee/leave/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success('Leave request cancelled');
        fetchLeaveRequests();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to cancel request:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to cancel request');
    }
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    // Calculate working days (excluding weekends AND holidays)
    return calculateWorkingDays(formData.startDate, formData.endDate, holidayDates);
  };

  // Get date range status for displaying holidays/weekends in the selected range
  const getSelectedDateRangeInfo = () => {
    if (!formData.startDate || !formData.endDate) return [];
    return getDateRangeWithStatus(formData.startDate, formData.endDate, holidayDates);
  };

  const selectedRangeInfo = getSelectedDateRangeInfo();
  const holidaysInRange = selectedRangeInfo.filter(d => d.status === 'holiday');
  const weekendsInRange = selectedRangeInfo.filter(d => d.status === 'weekend');

  const requestedDays = calculateDays();
  const selectedBalance = balances.find((b) => b.leaveType === formData.leaveType);
  const insufficientBalance = selectedBalance && requestedDays > selectedBalance.balance;

  // Calculate if request violates policies
  const calculateNoticeDays = () => {
    if (!formData.startDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(formData.startDate);
    start.setHours(0, 0, 0, 0);
    return Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const noticeDays = calculateNoticeDays();
  const violatesNoticePolicy = settings && noticeDays < settings.minimumLeaveNoticeDays;
  const violatesMaxDaysPolicy = settings?.maximumConsecutiveLeaveDays && requestedDays > settings.maximumConsecutiveLeaveDays;

  const stats = {
    totalRequests: leaveRequests.length,
    pending: leaveRequests.filter((r) => r.status === 'PENDING').length,
    approved: leaveRequests.filter((r) => r.status === 'APPROVED').length,
    rejected: leaveRequests.filter((r) => r.status === 'REJECTED').length,
  };

  const getLeaveTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      ANNUAL: '🌴',
      SICK: '🏥',
      PERSONAL: '🏠',
      MATERNITY: '👶',
      PATERNITY: '👨‍👧',
      UNPAID: '💼',
    };
    return icons[type] || '📅';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
      APPROVED: 'bg-green-100 text-green-800 border-green-300',
      REJECTED: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'PENDING') return <Clock className="h-4 w-4" />;
    if (status === 'APPROVED') return <CheckCircle className="h-4 w-4" />;
    if (status === 'REJECTED') return <XCircle className="h-4 w-4" />;
    return null;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Leave Management</h1>
          <p className="text-slate-600 mt-1">Request and track your time off</p>
        </div>
        <Button
          onClick={() => setShowRequestForm(!showRequestForm)}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Request Leave
        </Button>
      </div>

      {/* Leave Balances */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Available Leave Balances</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {balances.map((balance) => (
            <Card key={balance.id} className="border-2">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl mb-1">{getLeaveTypeIcon(balance.leaveType)}</div>
                  <div className="text-xs font-medium text-slate-600 mb-1">
                    {balance.leaveType.charAt(0) + balance.leaveType.slice(1).toLowerCase()}
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{balance.balance}</div>
                  <div className="text-xs text-slate-500">days</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.totalRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Request Form */}
      {showRequestForm && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-2 border-purple-200">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Request Leave
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Policy Information */}
              {settings && (settings.minimumLeaveNoticeDays > 0 || settings.maximumConsecutiveLeaveDays) && (
                <Alert className="mb-4 border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-900">Leave Policy Requirements</AlertTitle>
                  <AlertDescription className="text-blue-800 mt-2">
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {settings.minimumLeaveNoticeDays > 0 && (
                        <li>
                          Minimum notice period: <strong>{settings.minimumLeaveNoticeDays} {settings.minimumLeaveNoticeDays === 1 ? 'day' : 'days'}</strong> before leave start date
                        </li>
                      )}
                      {settings.maximumConsecutiveLeaveDays && (
                        <li>
                          Maximum consecutive days: <strong>{settings.maximumConsecutiveLeaveDays} days</strong>
                        </li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div>
                  <Label htmlFor="leaveType">Leave Type *</Label>
                  <select
                    id="leaveType"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md mt-1"
                    value={formData.leaveType}
                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                    required
                  >
                    {balances.map((balance) => (
                      <option key={balance.leaveType} value={balance.leaveType}>
                        {getLeaveTypeIcon(balance.leaveType)}{' '}
                        {balance.leaveType.charAt(0) + balance.leaveType.slice(1).toLowerCase()} (
                        {balance.balance} days available)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      min={formatLocalDate(new Date())}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      min={formData.startDate || formatLocalDate(new Date())}
                      required
                    />
                  </div>
                </div>

                {/* Display holidays and weekends in selected range */}
                {formData.startDate && formData.endDate && (holidaysInRange.length > 0 || weekendsInRange.length > 0) && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-900">Days Excluded from Leave</AlertTitle>
                    <AlertDescription className="text-amber-800">
                      <div className="space-y-2 mt-2">
                        {holidaysInRange.length > 0 && (
                          <div>
                            <span className="font-medium">Holidays ({holidaysInRange.length}):</span>
                            <ul className="list-disc list-inside ml-2 text-sm">
                              {holidaysInRange.map(h => {
                                const holiday = holidays.find(hol => hol.date.split('T')[0] === h.date);
                                return (
                                  <li key={h.date}>
                                    {format(new Date(h.date + 'T00:00:00'), 'MMM d')} ({h.dayOfWeek}) - {holiday?.name || 'Holiday'}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                        {weekendsInRange.length > 0 && (
                          <div>
                            <span className="font-medium">Weekends ({weekendsInRange.length}):</span>
                            <span className="text-sm ml-2">
                              {weekendsInRange.map(w => `${format(new Date(w.date + 'T00:00:00'), 'MMM d')} (${w.dayOfWeek})`).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {requestedDays > 0 && (
                  <Alert className={(insufficientBalance || violatesNoticePolicy || violatesMaxDaysPolicy) ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}>
                    {(insufficientBalance || violatesNoticePolicy || violatesMaxDaysPolicy) ? <AlertCircle className="h-4 w-4 text-red-600" /> : <Info className="h-4 w-4 text-blue-600" />}
                    <AlertTitle className={(insufficientBalance || violatesNoticePolicy || violatesMaxDaysPolicy) ? 'text-red-900' : 'text-blue-900'}>
                      {requestedDays} {requestedDays === 1 ? 'Day' : 'Days'} Requested
                    </AlertTitle>
                    <AlertDescription className={(insufficientBalance || violatesNoticePolicy || violatesMaxDaysPolicy) ? 'text-red-800' : 'text-blue-800'}>
                      <div className="space-y-1">
                        {insufficientBalance && (
                          <div className="flex items-start gap-2">
                            <span className="text-red-600">⚠️</span>
                            <span>Insufficient balance. You have {selectedBalance?.balance} days available.</span>
                          </div>
                        )}
                        {violatesNoticePolicy && (
                          <div className="flex items-start gap-2">
                            <span className="text-red-600">⚠️</span>
                            <span>
                              Requires {settings?.minimumLeaveNoticeDays} {settings?.minimumLeaveNoticeDays === 1 ? 'day' : 'days'} notice, but only {noticeDays} {noticeDays === 1 ? 'day' : 'days'} provided.
                            </span>
                          </div>
                        )}
                        {violatesMaxDaysPolicy && (
                          <div className="flex items-start gap-2">
                            <span className="text-red-600">⚠️</span>
                            <span>
                              Maximum consecutive days is {settings?.maximumConsecutiveLeaveDays}, but you requested {requestedDays} days.
                            </span>
                          </div>
                        )}
                        {!insufficientBalance && !violatesNoticePolicy && !violatesMaxDaysPolicy && (
                          <div>
                            ✓ Available balance after request: {(selectedBalance?.balance || 0) - requestedDays} days
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Add any additional details about your leave request..."
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Medical Certificate Upload for Sick Leave */}
                {formData.leaveType === 'SICK' && (
                  <div>
                    <Label htmlFor="medicalCertificate">Medical Certificate</Label>
                    <div className="mt-1">
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('medicalCertificate')?.click()}
                          className="flex-shrink-0"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {medicalCertificate ? 'Change File' : 'Upload File'}
                        </Button>
                        {medicalCertificate && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 flex-1 min-w-0">
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{medicalCertificate.name}</span>
                            <span className="text-slate-400 flex-shrink-0">
                              ({(medicalCertificate.size / 1024).toFixed(1)} KB)
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setMedicalCertificate(null)}
                              className="text-red-600 hover:text-red-700 flex-shrink-0"
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                      <input
                        id="medicalCertificate"
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error('File size must be less than 5MB');
                              return;
                            }
                            setMedicalCertificate(file);
                          }
                        }}
                        className="hidden"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Upload a medical certificate (PDF, DOC, DOCX, or image). Max 5MB.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={insufficientBalance || requestedDays === 0 || violatesNoticePolicy || violatesMaxDaysPolicy}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Request
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowRequestForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Leave Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Request History</CardTitle>
          <CardDescription>View all your past and pending leave requests</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-slate-600 mt-2">Loading requests...</p>
            </div>
          ) : leaveRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center">
                <Calendar className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No leave requests yet</h3>
              <p className="text-slate-600 mb-6">Click "Request Leave" to submit your first request</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaveRequests.map((request) => (
                <div key={request.id} className="border border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getLeaveTypeIcon(request.leaveType)}</span>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {request.leaveType.charAt(0) + request.leaveType.slice(1).toLowerCase()} Leave
                          </div>
                          <div className="text-sm text-slate-600">
                            {format(new Date(request.startDate), 'MMM d, yyyy')} -{' '}
                            {format(new Date(request.endDate), 'MMM d, yyyy')} ({request.days}{' '}
                            {request.days === 1 ? 'day' : 'days'})
                          </div>
                        </div>
                        <Badge className={`text-xs font-semibold ${getStatusColor(request.status)} border`}>
                          {getStatusIcon(request.status)}
                          <span className="ml-1">{request.status}</span>
                        </Badge>
                      </div>

                      {request.reason && (
                        <p className="text-sm text-slate-700 mt-2 ml-11">
                          {request.reason.startsWith('REJECTED:') ? (
                            <span className="text-red-700 font-medium">{request.reason}</span>
                          ) : (
                            request.reason
                          )}
                        </p>
                      )}

                      {request.medicalCertificateUrl && (
                        <div className="mt-2 ml-11">
                          <a
                            href={request.medicalCertificateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <FileText className="h-4 w-4" />
                            View Medical Certificate
                          </a>
                        </div>
                      )}

                      <div className="text-xs text-slate-500 mt-2 ml-11">
                        Requested on {format(new Date(request.createdAt), 'MMM d, yyyy')}
                      </div>
                    </div>

                    {request.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelRequest(request.id)}
                        className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
