'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, User, Calendar, Filter } from 'lucide-react';
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

export default function LeaveApprovalsPage() {
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>('all');
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
          description: 'Employee has been notified',
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
          description: 'Employee has been notified',
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
    };
    return icons[type] || '📅';
  };

  const filteredRequests =
    selectedMember === 'all'
      ? pendingRequests
      : pendingRequests.filter((r) => r.employee.user.id === selectedMember);

  const stats = {
    totalPending: pendingRequests.length,
    totalDays: pendingRequests.reduce((sum, r) => sum + r.days, 0),
    teamMembers: teamMembers.length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Leave Approvals</h1>
          <p className="text-slate-600 mt-1">Review and approve team leave requests</p>
        </div>
        <Button variant="outline" onClick={fetchPendingRequests}>
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.totalPending}</div>
            <p className="text-xs text-slate-500 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{stats.totalDays}</div>
            <p className="text-xs text-slate-500 mt-1">Days requested</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.teamMembers}</div>
            <p className="text-xs text-slate-500 mt-1">With pending requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-slate-600" />
            <div className="flex-1">
              <Label className="text-sm font-medium">Filter by Team Member:</Label>
              <select
                className="w-full md:w-64 px-3 py-2 border border-slate-300 rounded-md mt-1"
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
              >
                <option value="all">All Team Members ({stats.teamMembers})</option>
                {teamMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name} ({member.pendingCount} pending)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Summary Cards */}
      {selectedMember === 'all' && teamMembers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teamMembers.map((member) => (
            <Card key={member.userId} className="border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-slate-600" />
                      <h3 className="font-semibold text-slate-900">{member.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {member.employeeId}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <div className="text-sm text-slate-600">Pending Requests</div>
                        <div className="text-xl font-bold text-orange-600">{member.pendingCount}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600">Total Days</div>
                        <div className="text-xl font-bold text-purple-600">{member.totalDays}</div>
                      </div>
                    </div>
                  </div>

                  <Button size="sm" variant="outline" onClick={() => setSelectedMember(member.userId)}>
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pending Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-slate-600 mt-2">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-3" />
              <h3 className="text-lg font-semibold text-slate-900">All Caught Up!</h3>
              <p className="text-slate-600 mt-1">No pending leave requests to review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Employee Info */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-600" />
                          <span className="font-semibold text-slate-900">
                            {request.employee.user.firstName} {request.employee.user.lastName}
                          </span>
                        </div>
                        <Badge variant="outline">{request.employee.user.employeeId}</Badge>
                        <span className="text-xs text-slate-500">
                          Requested {format(new Date(request.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>

                      {/* Leave Details */}
                      <div className="flex items-center gap-3 mb-2 ml-6">
                        <span className="text-2xl">{getLeaveTypeIcon(request.leaveType)}</span>
                        <div>
                          <div className="font-medium text-slate-900">
                            {request.leaveType.charAt(0) + request.leaveType.slice(1).toLowerCase()} Leave
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(request.startDate), 'MMM d, yyyy')} -{' '}
                            {format(new Date(request.endDate), 'MMM d, yyyy')}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                            <Clock className="h-3 w-3" />
                            {request.days} {request.days === 1 ? 'day' : 'days'}
                          </div>
                        </div>
                      </div>

                      {/* Reason */}
                      {request.reason && (
                        <div className="ml-6 mt-3 p-3 bg-slate-50 rounded-md">
                          <div className="text-xs font-medium text-slate-600 mb-1">Reason:</div>
                          <p className="text-sm text-slate-700">{request.reason}</p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => {
                          setRequestToApprove(request);
                          setShowApproveConfirm(true);
                        }}
                        disabled={actionInProgress === request.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {actionInProgress === request.id ? (
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
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRejectDialog(true);
                        }}
                        disabled={actionInProgress === request.id}
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
            ? `Approve ${requestToApprove.leaveType.toLowerCase()} leave for ${requestToApprove.employee.user.firstName} ${requestToApprove.employee.user.lastName} (${format(new Date(requestToApprove.startDate), 'MMM d')} - ${format(new Date(requestToApprove.endDate), 'MMM d, yyyy')}, ${requestToApprove.days} days)?`
            : ''
        }
        confirmText="Approve"
        variant="success"
        isLoading={actionInProgress === requestToApprove?.id}
      />

      {/* Reject Dialog */}
      {showRejectDialog && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg m-4">
            <CardHeader className="bg-red-50 border-b border-red-200">
              <CardTitle className="flex items-center gap-2 text-red-900">
                <XCircle className="h-5 w-5" />
                Reject Leave Request
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertDescription className="text-orange-800">
                  Employee: {selectedRequest.employee.user.firstName} {selectedRequest.employee.user.lastName}
                  <br />
                  Leave Type: {selectedRequest.leaveType.charAt(0) + selectedRequest.leaveType.slice(1).toLowerCase()}
                  <br />
                  Dates: {format(new Date(selectedRequest.startDate), 'MMM d, yyyy')} -{' '}
                  {format(new Date(selectedRequest.endDate), 'MMM d, yyyy')} ({selectedRequest.days} days)
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
                  This will be sent to the employee for their reference.
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
  );
}
