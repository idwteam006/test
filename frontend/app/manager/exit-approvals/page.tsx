'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserMinus,
  Calendar,
  Clock,
  CheckCircle,
  X,
  Loader2,
  AlertTriangle,
  User,
  Building2,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ExitRequest {
  id: string;
  resignationDate: string;
  lastWorkingDate: string;
  reason: string;
  reasonCategory: string;
  noticePeriodDays: number;
  noticePeriodWaived: boolean;
  status: string;
  remarks?: string;
  employee: {
    id: string;
    employeeNumber: string;
    jobTitle: string;
    startDate: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    department: {
      id: string;
      name: string;
    };
  };
  daysUntilExit: number;
  clearanceProgress: {
    total: number;
    completed: number;
    percentage: number;
  };
}

const REASON_CATEGORIES: Record<string, { label: string; icon: string }> = {
  BETTER_OPPORTUNITY: { label: 'Better Opportunity', icon: '🚀' },
  HIGHER_EDUCATION: { label: 'Higher Education', icon: '📚' },
  RELOCATION: { label: 'Relocation', icon: '🏠' },
  PERSONAL_REASONS: { label: 'Personal Reasons', icon: '👤' },
  HEALTH_ISSUES: { label: 'Health Issues', icon: '🏥' },
  CAREER_CHANGE: { label: 'Career Change', icon: '🔄' },
  COMPENSATION: { label: 'Compensation', icon: '💰' },
  WORK_ENVIRONMENT: { label: 'Work Environment', icon: '🏢' },
  MANAGEMENT_ISSUES: { label: 'Management Issues', icon: '👔' },
  RETIREMENT: { label: 'Retirement', icon: '🌴' },
  OTHER: { label: 'Other', icon: '📝' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_MANAGER: { label: 'Pending Your Approval', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  MANAGER_APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700 border-green-200' },
  MANAGER_REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200' },
  HR_PROCESSING: { label: 'HR Processing', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  CLEARANCE_PENDING: { label: 'Clearance In Progress', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  CLEARANCE_COMPLETED: { label: 'Clearance Done', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  COMPLETED: { label: 'Completed', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  WITHDRAWN: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export default function ManagerExitApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [exitRequests, setExitRequests] = useState<ExitRequest[]>([]);
  const [stats, setStats] = useState({ pending: 0, managerApproved: 0, inProgress: 0, completed: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<ExitRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [remarks, setRemarks] = useState('');
  const [newLastDate, setNewLastDate] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchExitRequests();
  }, [statusFilter]);

  const fetchExitRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/hr/exit?${params}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setExitRequests(data.data || []);
        setStats(data.stats || { pending: 0, managerApproved: 0, inProgress: 0, completed: 0 });
      } else {
        toast.error(data.error || 'Failed to load exit requests');
      }
    } catch (error) {
      console.error('Fetch exit requests error:', error);
      toast.error('Failed to load exit requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedRequest) return;
    if (actionType === 'reject' && !remarks) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/hr/exit/${selectedRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType === 'approve' ? 'MANAGER_APPROVE' : 'MANAGER_REJECT',
          remarks,
          lastWorkingDate: newLastDate || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Resignation ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`);
        setActionDialogOpen(false);
        setRemarks('');
        setNewLastDate('');
        setSelectedRequest(null);
        fetchExitRequests();
      } else {
        toast.error(data.error || `Failed to ${actionType} resignation`);
      }
    } catch (error) {
      console.error('Action error:', error);
      toast.error('Network error');
    } finally {
      setProcessing(false);
    }
  };

  const openActionDialog = (request: ExitRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setNewLastDate(request.lastWorkingDate.split('T')[0]);
    setActionDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateTenure = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const years = Math.floor((now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor(((now.getTime() - start.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
    if (years > 0) return `${years}y ${months}m`;
    return `${months} months`;
  };

  const pendingRequests = exitRequests.filter(r => r.status === 'PENDING_MANAGER');
  const otherRequests = exitRequests.filter(r => r.status !== 'PENDING_MANAGER');

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Exit Approvals
          </h1>
          <p className="text-gray-600 mt-2">Review and approve resignation requests from your team</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <Card className={`cursor-pointer transition-all ${statusFilter === 'PENDING_MANAGER' ? 'ring-2 ring-yellow-500' : ''}`} onClick={() => setStatusFilter('PENDING_MANAGER')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition-all ${statusFilter === 'MANAGER_APPROVED' ? 'ring-2 ring-green-500' : ''}`} onClick={() => setStatusFilter('MANAGER_APPROVED')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.managerApproved}</p>
                  <p className="text-xs text-gray-500">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition-all ${statusFilter === 'HR_PROCESSING' ? 'ring-2 ring-purple-500' : ''}`} onClick={() => setStatusFilter('HR_PROCESSING')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                  <p className="text-xs text-gray-500">Processing</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-gray-500' : ''}`} onClick={() => setStatusFilter('all')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <UserMinus className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending Approvals */}
            {pendingRequests.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  Pending Your Approval ({pendingRequests.length})
                </h2>
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <Card key={request.id} className="border-yellow-200 bg-yellow-50/50 hover:shadow-lg transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-lg">
                              {request.employee.user.firstName[0]}{request.employee.user.lastName[0]}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-gray-900">
                                {request.employee.user.firstName} {request.employee.user.lastName}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {request.employee.jobTitle} • {request.employee.department.name}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Joined: {formatDate(request.employee.startDate)}
                                </span>
                                <span>Tenure: {calculateTenure(request.employee.startDate)}</span>
                              </div>
                            </div>
                          </div>
                          <Badge className={STATUS_CONFIG[request.status].color}>
                            {STATUS_CONFIG[request.status].label}
                          </Badge>
                        </div>

                        <div className="mt-4 p-4 bg-white rounded-lg border">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-500">Resignation Date</p>
                              <p className="font-medium">{formatDate(request.resignationDate)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Proposed Last Date</p>
                              <p className="font-medium">{formatDate(request.lastWorkingDate)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Days Remaining</p>
                              <p className={`font-medium ${request.daysUntilExit <= 7 ? 'text-red-600' : ''}`}>
                                {request.daysUntilExit} days
                              </p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <p className="text-xs text-gray-500 mb-1">Reason</p>
                            <Badge variant="outline" className="mb-2">
                              {REASON_CATEGORIES[request.reasonCategory]?.icon}{' '}
                              {REASON_CATEGORIES[request.reasonCategory]?.label}
                            </Badge>
                            <p className="text-gray-700">{request.reason}</p>
                          </div>

                          {request.noticePeriodWaived && (
                            <div className="p-2 bg-amber-50 rounded border border-amber-200 mb-4">
                              <p className="text-sm text-amber-700">
                                <AlertTriangle className="w-4 h-4 inline mr-1" />
                                Notice period shortened (Standard: {request.noticePeriodDays} days)
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-3 mt-4">
                          <Button
                            variant="outline"
                            onClick={() => openActionDialog(request, 'reject')}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <ThumbsDown className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                          <Button
                            onClick={() => openActionDialog(request, 'approve')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <ThumbsUp className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Other Requests */}
            {otherRequests.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {statusFilter === 'all' ? 'Other Exit Requests' : `${STATUS_CONFIG[statusFilter]?.label || 'Filtered'} Requests`}
                </h2>
                <div className="space-y-3">
                  {otherRequests.map((request) => (
                    <Card key={request.id} className="hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold">
                              {request.employee.user.firstName[0]}{request.employee.user.lastName[0]}
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">
                                {request.employee.user.firstName} {request.employee.user.lastName}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {request.employee.jobTitle} • Last day: {formatDate(request.lastWorkingDate)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={STATUS_CONFIG[request.status].color}>
                              {STATUS_CONFIG[request.status].label}
                            </Badge>
                            {request.clearanceProgress && request.clearanceProgress.total > 0 && (
                              <div className="text-sm text-gray-500">
                                {request.clearanceProgress.percentage}% cleared
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {exitRequests.length === 0 && (
              <div className="text-center py-12">
                <UserMinus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Exit Requests</h3>
                <p className="text-gray-600">
                  {statusFilter !== 'all'
                    ? 'No requests match the selected filter'
                    : 'No resignation requests from your team members'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Resignation' : 'Reject Resignation'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <span>
                  {actionType === 'approve'
                    ? `Approve resignation for ${selectedRequest.employee.user.firstName} ${selectedRequest.employee.user.lastName}`
                    : `Reject resignation for ${selectedRequest.employee.user.firstName} ${selectedRequest.employee.user.lastName}`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionType === 'approve' && (
              <div>
                <Label htmlFor="lastDate">Last Working Date</Label>
                <Input
                  id="lastDate"
                  type="date"
                  value={newLastDate}
                  onChange={(e) => setNewLastDate(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can adjust the last working date if needed
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="remarks">
                {actionType === 'approve' ? 'Remarks (Optional)' : 'Reason for Rejection *'}
              </Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={actionType === 'approve' ? 'Add any remarks...' : 'Please provide a reason for rejection'}
                rows={3}
                className="mt-1"
              />
            </div>

            {actionType === 'reject' && (
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-700">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Rejecting a resignation is a significant action. The employee will be notified and may choose to discuss further.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing || (actionType === 'reject' && !remarks)}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : actionType === 'approve' ? (
                <>
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Approve
                </>
              ) : (
                <>
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
