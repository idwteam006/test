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
  FileText,
  ClipboardCheck,
  MessageSquare,
  Search,
  Filter,
  DollarSign,
  Briefcase,
  Eye,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import Link from 'next/link';

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
  finalSettlementAmount?: number;
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
    manager?: {
      user: {
        firstName: string;
        lastName: string;
      };
    };
  };
  exitInterview?: {
    isCompleted: boolean;
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING_MANAGER: { label: 'Pending Manager', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  MANAGER_APPROVED: { label: 'Manager Approved', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  MANAGER_REJECTED: { label: 'Manager Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
  HR_PROCESSING: { label: 'HR Processing', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  CLEARANCE_PENDING: { label: 'Clearance Pending', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  CLEARANCE_COMPLETED: { label: 'Clearance Done', color: 'text-teal-700', bgColor: 'bg-teal-100' },
  COMPLETED: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  WITHDRAWN: { label: 'Withdrawn', color: 'text-gray-500', bgColor: 'bg-gray-100' },
};

export default function HRExitManagementPage() {
  const [loading, setLoading] = useState(true);
  const [exitRequests, setExitRequests] = useState<ExitRequest[]>([]);
  const [stats, setStats] = useState({ pending: 0, managerApproved: 0, inProgress: 0, completed: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState<ExitRequest | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<string>('');
  const [remarks, setRemarks] = useState('');
  const [finalSettlement, setFinalSettlement] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchExitRequests();
  }, []);

  const fetchExitRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hr/exit');
      const data = await response.json();

      if (response.ok && data.success) {
        setExitRequests(data.data || []);
        setStats(data.stats || { pending: 0, managerApproved: 0, inProgress: 0, completed: 0, total: 0 });
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
    if (!selectedRequest || !actionType) return;

    setProcessing(true);
    try {
      const body: any = { action: actionType, remarks };
      if (actionType === 'COMPLETE_EXIT' && finalSettlement) {
        body.finalSettlementAmount = parseFloat(finalSettlement);
      }

      const response = await fetch(`/api/hr/exit/${selectedRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message || 'Action completed successfully');
        setActionDialogOpen(false);
        setRemarks('');
        setFinalSettlement('');
        fetchExitRequests();
      } else {
        toast.error(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Action error:', error);
      toast.error('Network error');
    } finally {
      setProcessing(false);
    }
  };

  const openActionDialog = (request: ExitRequest, action: string) => {
    setSelectedRequest(request);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getFilteredRequests = () => {
    let filtered = exitRequests;

    // Filter by tab
    switch (selectedTab) {
      case 'pending':
        filtered = filtered.filter(r => ['MANAGER_APPROVED', 'HR_PROCESSING'].includes(r.status));
        break;
      case 'clearance':
        filtered = filtered.filter(r => ['CLEARANCE_PENDING', 'CLEARANCE_COMPLETED'].includes(r.status));
        break;
      case 'completed':
        filtered = filtered.filter(r => r.status === 'COMPLETED');
        break;
      case 'all':
      default:
        break;
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => {
        const name = `${r.employee.user.firstName} ${r.employee.user.lastName}`.toLowerCase();
        return name.includes(query) || r.employee.user.email.toLowerCase().includes(query);
      });
    }

    return filtered;
  };

  const filteredRequests = getFilteredRequests();

  const getNextAction = (status: string) => {
    switch (status) {
      case 'MANAGER_APPROVED':
        return { action: 'HR_PROCESS', label: 'Start Processing', color: 'bg-purple-600' };
      case 'HR_PROCESSING':
        return { action: 'START_CLEARANCE', label: 'Start Clearance', color: 'bg-orange-600' };
      case 'CLEARANCE_PENDING':
        return { action: 'COMPLETE_CLEARANCE', label: 'Complete Clearance', color: 'bg-teal-600' };
      case 'CLEARANCE_COMPLETED':
        return { action: 'COMPLETE_EXIT', label: 'Complete Exit', color: 'bg-green-600' };
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Exit Management
          </h1>
          <p className="text-gray-600 mt-2">Manage employee offboarding and clearance process</p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-gray-500">Pending Manager</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.managerApproved}</p>
                  <p className="text-xs text-gray-500">Ready for HR</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <ClipboardCheck className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                  <p className="text-xs text-gray-500">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserMinus className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Briefcase className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                  <Label>Search Employee</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs and Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">
                Pending HR Action
                {(stats.managerApproved + stats.inProgress) > 0 && (
                  <Badge className="ml-2 bg-purple-600">{stats.managerApproved + stats.inProgress}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="clearance">Clearance</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request) => {
                  const statusConfig = STATUS_CONFIG[request.status];
                  const nextAction = getNextAction(request.status);

                  return (
                    <Card key={request.id} className="hover:shadow-lg transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          {/* Employee Info */}
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                              {request.employee.user.firstName[0]}{request.employee.user.lastName[0]}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-semibold text-lg">
                                  {request.employee.user.firstName} {request.employee.user.lastName}
                                </h3>
                                <Badge className={`${statusConfig.bgColor} ${statusConfig.color}`}>
                                  {statusConfig.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                {request.employee.jobTitle} • {request.employee.department.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {request.employee.user.email}
                              </p>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <p className="text-xs text-gray-500">Resignation Date</p>
                                  <p className="font-medium">{formatDate(request.resignationDate)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Last Working Date</p>
                                  <p className="font-medium">{formatDate(request.lastWorkingDate)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Days Remaining</p>
                                  <p className={`font-medium ${request.daysUntilExit <= 7 ? 'text-red-600' : ''}`}>
                                    {request.daysUntilExit > 0 ? `${request.daysUntilExit} days` : 'Past due'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Clearance</p>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                                      <div
                                        className="bg-purple-600 h-2 rounded-full"
                                        style={{ width: `${request.clearanceProgress.percentage}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium">{request.clearanceProgress.percentage}%</span>
                                  </div>
                                </div>
                              </div>

                              {/* Reason */}
                              <div className="mt-3">
                                <Badge variant="outline" className="mr-2">
                                  {REASON_CATEGORIES[request.reasonCategory]?.icon}{' '}
                                  {REASON_CATEGORIES[request.reasonCategory]?.label}
                                </Badge>
                                {request.exitInterview && !request.exitInterview.isCompleted && (
                                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                                    <MessageSquare className="w-3 h-3 mr-1" />
                                    Interview Pending
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2 ml-4">
                            <Link href={`/hr/exit-management/${request.id}`}>
                              <Button variant="outline" size="sm" className="w-full">
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Button>
                            </Link>
                            {nextAction && (
                              <Button
                                size="sm"
                                className={`${nextAction.color} hover:opacity-90`}
                                onClick={() => openActionDialog(request, nextAction.action)}
                              >
                                <ChevronRight className="w-4 h-4 mr-1" />
                                {nextAction.label}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {filteredRequests.length === 0 && (
                  <div className="text-center py-12">
                    <UserMinus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Exit Requests</h3>
                    <p className="text-gray-600">
                      {searchQuery
                        ? 'No requests match your search'
                        : `No ${selectedTab === 'all' ? '' : selectedTab} exit requests found`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Tabs>
        </motion.div>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'HR_PROCESS' && 'Start HR Processing'}
              {actionType === 'START_CLEARANCE' && 'Start Clearance Process'}
              {actionType === 'COMPLETE_CLEARANCE' && 'Complete Clearance'}
              {actionType === 'COMPLETE_EXIT' && 'Complete Exit Process'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <span>
                  Processing exit for {selectedRequest.employee.user.firstName} {selectedRequest.employee.user.lastName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionType === 'COMPLETE_EXIT' && (
              <div>
                <Label htmlFor="settlement">Final Settlement Amount</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="settlement"
                    type="number"
                    value={finalSettlement}
                    onChange={(e) => setFinalSettlement(e.target.value)}
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any remarks..."
                rows={3}
                className="mt-1"
              />
            </div>

            {actionType === 'COMPLETE_CLEARANCE' && (
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-700">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Make sure all clearance tasks are completed before proceeding.
                </p>
              </div>
            )}

            {actionType === 'COMPLETE_EXIT' && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  This will mark the employee as resigned and disable their account.
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
              disabled={processing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
