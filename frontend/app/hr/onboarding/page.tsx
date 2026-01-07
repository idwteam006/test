'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  UserPlus,
  Calendar,
  Mail,
  Briefcase,
  Upload,
  Send,
  Trash2,
  Filter,
  Search,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface OnboardingSubmission {
  invite: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    designation: string;
    joiningDate: string;
    workLocation?: string;
    employmentType: string;
    status: string;
    createdAt: string;
    completedAt?: string;
  };
  user: {
    id: string;
    email: string;
    employeeId: string;
    status: string;
    department: {
      name: string;
    };
    manager?: {
      firstName: string;
      lastName: string;
    };
  };
  profile: any;
}

export default function HROnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState<OnboardingSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<OnboardingSubmission[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('SUBMITTED');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSubmissions = async (status: string = 'SUBMITTED') => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/hr/onboarding/pending?status=${status}`);
      const data = await response.json();

      if (data.success) {
        setSubmissions(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch submissions');
      }
    } catch (error) {
      toast.error('An error occurred while fetching submissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubmissions(selectedStatus);
  }, [selectedStatus]);

  // Filter submissions based on search and department
  useEffect(() => {
    let filtered = submissions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.invite.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.invite.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.invite.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.user.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Department filter
    if (departmentFilter !== 'ALL') {
      filtered = filtered.filter((s) => s.user.department.name === departmentFilter);
    }

    setFilteredSubmissions(filtered);
  }, [submissions, searchTerm, departmentFilter]);

  const handleQuickApprove = async (inviteId: string) => {
    if (!confirm('Are you sure you want to approve this employee? They will be activated and can login immediately.')) {
      return;
    }

    setActionLoading(inviteId);
    try {
      const response = await fetch('/api/hr/onboarding/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Employee approved and activated!');
        fetchSubmissions(selectedStatus);
      } else {
        toast.error(data.error || 'Failed to approve');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    setActionLoading(inviteId);
    try {
      const response = await fetch('/api/hr/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Invitation resent successfully!');
      } else {
        toast.error(data.error || 'Failed to resend invitation');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelInvite = async () => {
    if (!selectedInvite) return;

    setActionLoading(selectedInvite);
    try {
      const response = await fetch('/api/hr/cancel-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId: selectedInvite }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Invitation cancelled successfully');
        fetchSubmissions(selectedStatus);
      } else {
        toast.error(data.error || 'Failed to cancel invitation');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setActionLoading(null);
      setCancelDialogOpen(false);
      setSelectedInvite(null);
    }
  };

  const openCancelDialog = (inviteId: string) => {
    setSelectedInvite(inviteId);
    setCancelDialogOpen(true);
  };

  const uniqueDepartments = Array.from(new Set(submissions.map((s) => s.user.department.name)));

  const handleViewDetails = (inviteId: string) => {
    router.push(`/hr/onboarding/review/${inviteId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-gray-100">Pending</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="bg-blue-100 text-blue-700">In Progress</Badge>;
      case 'SUBMITTED':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-700">Awaiting Review</Badge>;
      case 'CHANGES_REQUESTED':
        return <Badge variant="outline" className="bg-orange-100 text-orange-700">Changes Requested</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-100 text-green-700">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-100 text-red-700">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEmploymentTypeBadge = (type: string) => {
    const colors: any = {
      FULL_TIME: 'bg-blue-100 text-blue-700',
      PART_TIME: 'bg-purple-100 text-purple-700',
      CONTRACT: 'bg-orange-100 text-orange-700',
      INTERN: 'bg-green-100 text-green-700',
    };

    return (
      <Badge variant="outline" className={colors[type] || ''}>
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 p-4">
      <div className="max-w-7xl mx-auto py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Employee Onboarding</h1>
            <p className="text-white/90">Review and manage employee onboarding submissions</p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={() => fetchSubmissions(selectedStatus)}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="outline"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={() => router.push('/hr/bulk-invite')}
            >
              <Upload className="mr-2 h-4 w-4" />
              Bulk Invite
            </Button>

            <Button
              className="bg-white text-purple-600 hover:bg-white/90"
              onClick={() => router.push('/hr/invite-employee')}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Employee
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold">
                    {submissions.filter(s => s.invite.status === 'SUBMITTED').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">
                    {submissions.filter(s => s.invite.status === 'APPROVED').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Changes Requested</p>
                  <p className="text-2xl font-bold">
                    {submissions.filter(s => s.invite.status === 'CHANGES_REQUESTED').length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Invited</p>
                  <p className="text-2xl font-bold">{submissions.length}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submissions Table */}
        <Card className="border-0 shadow-2xl">
          <CardHeader>
            <CardTitle>Onboarding Submissions</CardTitle>
            <CardDescription>
              View and manage employee onboarding requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
              <TabsList className="mb-4">
                <TabsTrigger value="SUBMITTED">Pending Review</TabsTrigger>
                <TabsTrigger value="APPROVED">Approved</TabsTrigger>
                <TabsTrigger value="CHANGES_REQUESTED">Changes Requested</TabsTrigger>
                <TabsTrigger value="PENDING">All Invites</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedStatus}>
                {/* Filters */}
                <div className="flex gap-3 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or employee ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-[200px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Departments</SelectItem>
                      {uniqueDepartments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {filteredSubmissions.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No submissions found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Designation</TableHead>
                          <TableHead>Employment Type</TableHead>
                          <TableHead>Joining Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSubmissions.map((submission) => (
                          <TableRow key={submission.invite.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {submission.invite.firstName} {submission.invite.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {submission.invite.email}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {submission.user.employeeId}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{submission.user.department.name}</TableCell>
                            <TableCell>{submission.invite.designation}</TableCell>
                            <TableCell>
                              {getEmploymentTypeBadge(submission.invite.employmentType)}
                            </TableCell>
                            <TableCell>{formatDate(submission.invite.joiningDate)}</TableCell>
                            <TableCell>{getStatusBadge(submission.invite.status)}</TableCell>
                            <TableCell>
                              {submission.invite.completedAt
                                ? formatDate(submission.invite.completedAt)
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                {submission.invite.status === 'SUBMITTED' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleQuickApprove(submission.invite.id)}
                                    disabled={actionLoading === submission.invite.id}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                )}

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetails(submission.invite.id)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Review
                                </Button>

                                {(submission.invite.status === 'PENDING' || submission.invite.status === 'IN_PROGRESS') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => handleResendInvite(submission.invite.id)}
                                    disabled={actionLoading === submission.invite.id}
                                  >
                                    <Send className="h-4 w-4 mr-1" />
                                    Resend
                                  </Button>
                                )}

                                {submission.invite.status !== 'APPROVED' && submission.user.status !== 'ACTIVE' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => openCancelDialog(submission.invite.id)}
                                    disabled={actionLoading === submission.invite.id}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this invitation? This will delete the invitation and user record. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelInvite}
                className="bg-red-600 hover:bg-red-700"
              >
                Yes, Cancel Invitation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
