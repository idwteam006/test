'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Filter,
  RefreshCw,
  Users,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface LeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: string;
  createdAt: string;
  medicalCertificateUrl?: string | null;
  employee: {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      employeeId: string;
    };
  };
}

interface TeamMember {
  userId: string;
  name: string;
  employeeId: string;
  pendingCount: number;
  totalDays: number;
}

export default function HRLeaveRequestsPage() {
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [requestToApprove, setRequestToApprove] = useState<LeaveRequest | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manager/leave/pending');
      const data = await response.json();

      if (data.success) {
        setPendingRequests(data.leaveRequests || []);
        setTeamMembers(data.teamSummary || []);
      } else {
        toast.error(data.error || 'Failed to load leave requests');
      }
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
      toast.error('Failed to load pending leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!requestToApprove) return;

    setActionInProgress(requestToApprove.id);
    const loadingToast = toast.loading('Approving leave request...', {
      description: 'Please wait',
    });

    try {
      const response = await fetch(`/api/manager/leave/${requestToApprove.id}/approve`, {
        method: 'POST',
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success('Leave request approved!', {
          description: 'Employee has been notified via email',
        });
        setShowApproveConfirm(false);
        setRequestToApprove(null);
        fetchPendingRequests();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to approve request:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to approve leave request');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setActionInProgress(selectedRequest.id);
    const loadingToast = toast.loading('Rejecting leave request...', {
      description: 'Please wait',
    });

    try {
      const response = await fetch(`/api/manager/leave/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success('Leave request rejected', {
          description: 'Employee has been notified via email',
        });
        setShowRejectDialog(false);
        setSelectedRequest(null);
        setRejectionReason('');
        fetchPendingRequests();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to reject request:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to reject leave request');
    } finally {
      setActionInProgress(null);
    }
  };

  const getLeaveTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      ANNUAL: '🌴',
      SICK: '🏥',
      PERSONAL: '🏠',
      MATERNITY: '👶',
      PATERNITY: '👨‍👧',
      UNPAID: '💼',
      BEREAVEMENT: '🕯️',
      STUDY: '📚',
    };
    return icons[type] || '📅';
  };

  const getLeaveTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      ANNUAL: 'bg-green-100 text-green-800',
      SICK: 'bg-red-100 text-red-800',
      PERSONAL: 'bg-blue-100 text-blue-800',
      MATERNITY: 'bg-pink-100 text-pink-800',
      PATERNITY: 'bg-indigo-100 text-indigo-800',
      UNPAID: 'bg-gray-100 text-gray-800',
      BEREAVEMENT: 'bg-purple-100 text-purple-800',
      STUDY: 'bg-yellow-100 text-yellow-800',
    };
    return colors[type] || 'bg-slate-100 text-slate-800';
  };

  // Get unique leave types from pending requests
  const leaveTypes = [...new Set(pendingRequests.map(r => r.leaveType))];

  const filteredRequests = pendingRequests.filter((request) => {
    const memberMatch = selectedMember === 'all' || request.employee.user.id === selectedMember;
    const typeMatch = selectedLeaveType === 'all' || request.leaveType === selectedLeaveType;
    return memberMatch && typeMatch;
  });

  const stats = {
    totalPending: pendingRequests.length,
    totalDays: pendingRequests.reduce((sum, r) => sum + r.days, 0),
    employees: teamMembers.length,
    sickLeave: pendingRequests.filter(r => r.leaveType === 'SICK').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
              Leave Requests
            </h1>
            <p className="text-slate-600 mt-2">
              Review and manage employee leave requests across the organization
            </p>
          </div>
          <Button
            onClick={fetchPendingRequests}
            variant="outline"
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Pending Requests</p>
                  <p className="text-3xl font-bold text-orange-700">{stats.totalPending}</p>
                </div>
                <div className="p-3 bg-orange-200 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Total Days</p>
                  <p className="text-3xl font-bold text-purple-700">{stats.totalDays}</p>
                </div>
                <div className="p-3 bg-purple-200 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Employees</p>
                  <p className="text-3xl font-bold text-blue-700">{stats.employees}</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-lg">
                  <Users className="w-6 h-6 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Sick Leave</p>
                  <p className="text-3xl font-bold text-red-700">{stats.sickLeave}</p>
                </div>
                <div className="p-3 bg-red-200 rounded-lg">
                  <FileText className="w-6 h-6 text-red-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Filters:</span>
              </div>

              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-slate-500">Employee</Label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                >
                  <option value="all">All Employees ({stats.employees})</option>
                  {teamMembers.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name} ({member.pendingCount} pending)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-slate-500">Leave Type</Label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  value={selectedLeaveType}
                  onChange={(e) => setSelectedLeaveType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  {leaveTypes.map((type) => (
                    <option key={type} value={type}>
                      {getLeaveTypeIcon(type)} {type.charAt(0) + type.slice(1).toLowerCase()} Leave
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leave Requests List */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between">
              <span>Pending Leave Requests ({filteredRequests.length})</span>
              {filteredRequests.length > 0 && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  {filteredRequests.reduce((sum, r) => sum + r.days, 0)} days total
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-slate-600 mt-4">Loading leave requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle className="h-20 w-20 mx-auto text-green-500 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900">All Caught Up!</h3>
                <p className="text-slate-600 mt-2">No pending leave requests to review</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border border-slate-200 rounded-xl p-5 hover:border-purple-300 hover:shadow-md transition-all bg-white"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Employee Info */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {request.employee.user.firstName[0]}{request.employee.user.lastName[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">
                                {request.employee.user.firstName} {request.employee.user.lastName}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {request.employee.user.employeeId}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500">{request.employee.user.email}</p>
                          </div>
                        </div>

                        {/* Leave Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getLeaveTypeIcon(request.leaveType)}</span>
                            <div>
                              <Badge className={getLeaveTypeBadgeColor(request.leaveType)}>
                                {request.leaveType.charAt(0) + request.leaveType.slice(1).toLowerCase()} Leave
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="h-4 w-4 text-purple-500" />
                            <span>
                              {format(new Date(request.startDate), 'MMM d')} - {format(new Date(request.endDate), 'MMM d, yyyy')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-orange-500" />
                            <span className="font-semibold text-orange-600">
                              {request.days} {request.days === 1 ? 'day' : 'days'}
                            </span>
                            <span className="text-slate-500">
                              • Requested {format(new Date(request.createdAt), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>

                        {/* Reason */}
                        {request.reason && (
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="text-xs font-medium text-slate-500 mb-1">Reason:</div>
                            <p className="text-sm text-slate-700">{request.reason}</p>
                          </div>
                        )}

                        {/* Medical Certificate */}
                        {request.medicalCertificateUrl && (
                          <div className="mt-3">
                            <a
                              href={request.medicalCertificateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
                            >
                              <FileText className="w-4 h-4" />
                              View Medical Certificate
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setRequestToApprove(request);
                            setShowApproveConfirm(true);
                          }}
                          disabled={actionInProgress === request.id}
                          className="bg-green-600 hover:bg-green-700 gap-1"
                        >
                          {actionInProgress === request.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowRejectDialog(true);
                          }}
                          disabled={actionInProgress === request.id}
                          className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50 gap-1"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approve Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showApproveConfirm}
          onClose={() => {
            setShowApproveConfirm(false);
            setRequestToApprove(null);
          }}
          onConfirm={handleApprove}
          title="Approve Leave Request"
          message={
            requestToApprove
              ? `Approve ${requestToApprove.leaveType.toLowerCase()} leave for ${requestToApprove.employee.user.firstName} ${requestToApprove.employee.user.lastName}?\n\nDates: ${format(new Date(requestToApprove.startDate), 'MMM d')} - ${format(new Date(requestToApprove.endDate), 'MMM d, yyyy')}\nDuration: ${requestToApprove.days} day(s)\n\nThis will deduct from their leave balance and notify them via email.`
              : ''
          }
          confirmText="Approve Leave"
          variant="success"
          isLoading={actionInProgress === requestToApprove?.id}
        />

        {/* Reject Dialog */}
        {showRejectDialog && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
              <CardHeader className="bg-red-50 border-b border-red-200">
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <XCircle className="h-5 w-5" />
                  Reject Leave Request
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertDescription className="text-orange-800">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><strong>Employee:</strong></div>
                      <div>{selectedRequest.employee.user.firstName} {selectedRequest.employee.user.lastName}</div>
                      <div><strong>Leave Type:</strong></div>
                      <div>{selectedRequest.leaveType.charAt(0) + selectedRequest.leaveType.slice(1).toLowerCase()}</div>
                      <div><strong>Dates:</strong></div>
                      <div>{format(new Date(selectedRequest.startDate), 'MMM d')} - {format(new Date(selectedRequest.endDate), 'MMM d, yyyy')}</div>
                      <div><strong>Duration:</strong></div>
                      <div>{selectedRequest.days} day(s)</div>
                    </div>
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="rejectReason">Reason for Rejection *</Label>
                  <Textarea
                    id="rejectReason"
                    placeholder="Please provide a clear reason for rejecting this leave request..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="mt-2"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This will be sent to the employee via email.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleReject}
                    variant="destructive"
                    className="flex-1"
                    disabled={!rejectionReason.trim() || actionInProgress === selectedRequest.id}
                  >
                    {actionInProgress === selectedRequest.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Rejecting...
                      </>
                    ) : (
                      'Reject Request'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectDialog(false);
                      setSelectedRequest(null);
                      setRejectionReason('');
                    }}
                    disabled={actionInProgress === selectedRequest.id}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
