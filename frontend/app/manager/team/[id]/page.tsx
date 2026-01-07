'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  Award,
  Clock,
  TrendingUp,
  Edit,
  MoreVertical,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TeamMemberDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  role: string;
  status: string;
  departmentId: string;
  department: {
    name: string;
  } | null;
  employee: {
    jobTitle: string;
    startDate: string;
    managerId: string | null;
    employmentType: string;
  } | null;
  employeeProfile: {
    personalPhone: string;
    dateOfBirth: string;
    gender: string;
    currentAddress: any;
    linkedinUrl: string;
    githubUrl: string;
  } | null;
}

interface PerformanceStats {
  tasksCompleted: number;
  tasksInProgress: number;
  avgCompletionTime: number;
  timesheetSubmissionRate: number;
  lastLogin: string;
}

export default function TeamMemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [memberId, setMemberId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<TeamMemberDetails | null>(null);
  const [stats, setStats] = useState<PerformanceStats | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      setMemberId(id);
      fetchMemberDetails(id);
    });
  }, [params]);

  const fetchMemberDetails = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/manager/team/${id}`);
      const data = await response.json();

      if (data.success) {
        setMember(data.member);
        setStats(data.stats);
      } else {
        toast.error('Failed to fetch member details');
      }
    } catch (error) {
      console.error('Error fetching member:', error);
      toast.error('Failed to load member details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'ON_LEAVE':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading || !member) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Team
        </Button>
        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
              {getInitials(member.firstName, member.lastName)}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {member.firstName} {member.lastName}
                  </h1>
                  <p className="text-lg text-gray-600 mt-1">
                    {member.employee?.jobTitle || member.department?.name || 'Employee'}
                  </p>
                </div>
                <Badge className={getStatusColor(member.status)}>
                  {member.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{member.email}</span>
                </div>
                {member.employeeProfile?.personalPhone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{member.employeeProfile.personalPhone}</span>
                  </div>
                )}
                {member.employee?.startDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Joined {format(new Date(member.employee.startDate), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Briefcase className="w-4 h-4" />
                  <span>{member.department?.name || 'No department'}</span>
                </div>
              </div>

              {/* Quick Stats */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{stats.tasksCompleted}</p>
                    <p className="text-xs text-gray-600 mt-1">Tasks Completed</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{stats.tasksInProgress}</p>
                    <p className="text-xs text-gray-600 mt-1">In Progress</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {stats.timesheetSubmissionRate}%
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Timesheet Rate</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">
                      {stats.avgCompletionTime}h
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Avg Completion</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Employee ID</span>
                  <span className="text-sm font-medium">{member.employeeId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Date of Birth</span>
                  <span className="text-sm font-medium">
                    {member.employeeProfile?.dateOfBirth
                      ? format(new Date(member.employeeProfile.dateOfBirth), 'MMM dd, yyyy')
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Gender</span>
                  <span className="text-sm font-medium">
                    {member.employeeProfile?.gender || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Role</span>
                  <Badge>{member.role}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Employment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Employment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Job Title</span>
                  <span className="text-sm font-medium">
                    {member.employee?.jobTitle || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Employment Type</span>
                  <span className="text-sm font-medium">
                    {member.employee?.employmentType || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Department</span>
                  <span className="text-sm font-medium">
                    {member.department?.name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Start Date</span>
                  <span className="text-sm font-medium">
                    {member.employee?.startDate
                      ? format(new Date(member.employee.startDate), 'MMM dd, yyyy')
                      : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          {member.employeeProfile?.currentAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Address</p>
                  <p className="text-sm">{JSON.stringify(member.employeeProfile.currentAddress)}</p>
                </div>
                {member.employeeProfile.linkedinUrl && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">LinkedIn</p>
                    <a
                      href={member.employeeProfile.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {member.employeeProfile.linkedinUrl}
                    </a>
                  </div>
                )}
                {member.employeeProfile.githubUrl && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">GitHub</p>
                    <a
                      href={member.employeeProfile.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {member.employeeProfile.githubUrl}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardContent className="py-12 text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Performance metrics coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Project and task assignments coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Activity history coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
