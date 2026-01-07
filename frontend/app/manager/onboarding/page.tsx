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
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export default function ManagerOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState<OnboardingSubmission[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('SUBMITTED');

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

  const handleViewDetails = (inviteId: string) => {
    router.push(`/manager/onboarding/review/${inviteId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-gray-100">Pending</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="bg-blue-100 text-blue-700">In Progress</Badge>;
      case 'SUBMITTED':
        return <Badge variant="outline" className="bg-green-100 text-green-700">Submitted</Badge>;
      case 'CHANGES_REQUESTED':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-700">Changes Requested</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-purple-100 text-purple-700">Approved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading onboarding submissions...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.invite.status === 'PENDING' || s.invite.status === 'IN_PROGRESS').length,
    submitted: submissions.filter(s => s.invite.status === 'SUBMITTED').length,
    approved: submissions.filter(s => s.invite.status === 'APPROVED').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 p-4">
      <div className="max-w-7xl mx-auto py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Employee Onboarding</h1>
          <p className="text-white/90">Review and approve employee onboarding submissions</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <Button
            className="bg-white/20 hover:bg-white/30 text-white border-white/20"
            onClick={() => router.push('/manager/invite-employee')}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Invite New Employee
          </Button>
          <Button
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            onClick={() => fetchSubmissions(selectedStatus)}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="text-2xl font-bold">{stats.submitted}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submissions Table */}
        <Card className="border-0 shadow-2xl">
          <CardHeader>
            <CardTitle>Onboarding Submissions</CardTitle>
            <CardDescription>View and manage employee onboarding progress</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
              <TabsList className="mb-4">
                <TabsTrigger value="SUBMITTED">Submitted</TabsTrigger>
                <TabsTrigger value="IN_PROGRESS">In Progress</TabsTrigger>
                <TabsTrigger value="APPROVED">Approved</TabsTrigger>
                <TabsTrigger value="CHANGES_REQUESTED">Changes Requested</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedStatus}>
                {submissions.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No {selectedStatus.toLowerCase().replace('_', ' ')} submissions found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Employee ID</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Designation</TableHead>
                          <TableHead>Joining Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissions.map((submission) => (
                          <TableRow key={submission.invite.id}>
                            <TableCell className="font-medium">
                              {submission.invite.firstName} {submission.invite.lastName}
                            </TableCell>
                            <TableCell>{submission.invite.email}</TableCell>
                            <TableCell>{submission.user.employeeId}</TableCell>
                            <TableCell>{submission.user.department.name}</TableCell>
                            <TableCell>{submission.invite.designation}</TableCell>
                            <TableCell>{formatDate(submission.invite.joiningDate)}</TableCell>
                            <TableCell>{getStatusBadge(submission.invite.status)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDetails(submission.invite.id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Review
                              </Button>
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
      </div>
    </div>
  );
}
