'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Calendar,
  FileText,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Loader2,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';

interface DashboardStats {
  todayHours: number;
  weekHours: number;
  monthHours: number;
  pendingLeaves: number;
  approvedLeaves: number;
  remainingLeaves: number;
  upcomingHolidays: number;
}

interface OnboardingStatus {
  status: 'INVITED' | 'PENDING_ONBOARDING' | 'ONBOARDING_COMPLETED' | 'CHANGES_REQUESTED' | 'APPROVED' | 'ACTIVE';
  completedSteps: number;
  totalSteps: number;
  inviteToken?: string;
  completedAt?: string;
}

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    todayHours: 0,
    weekHours: 0,
    monthHours: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
    remainingLeaves: 20,
    upcomingHolidays: 5,
  });

  const [user, setUser] = useState<any>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);

  useEffect(() => {
    fetchUser();
    fetchOnboardingStatus();
    fetchStats();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const fetchOnboardingStatus = async () => {
    try {
      setLoadingOnboarding(true);
      const response = await fetch('/api/employee/onboarding-status');
      const data = await response.json();
      if (data.success) {
        setOnboardingStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch onboarding status:', error);
    } finally {
      setLoadingOnboarding(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/employee/stats');
      const data = await response.json();

      if (data.success) {
        setStats({
          todayHours: data.stats.todayHours,
          weekHours: data.stats.weekHours,
          monthHours: data.stats.monthHours,
          pendingLeaves: data.stats.pendingRequests,
          approvedLeaves: data.stats.approvedRequests,
          remainingLeaves: data.stats.totalRemaining,
          upcomingHolidays: data.stats.upcomingHolidays,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const getOnboardingStatusInfo = () => {
    if (!onboardingStatus) return null;

    const statusMap = {
      INVITED: {
        label: 'Invited',
        description: 'You have been invited to join. Complete your onboarding to get started.',
        color: 'bg-blue-100 text-blue-700',
        icon: <UserCheck className="h-5 w-5" />,
        action: 'Complete Onboarding',
      },
      PENDING_ONBOARDING: {
        label: 'Pending Onboarding',
        description: 'Please complete your onboarding form to proceed.',
        color: 'bg-yellow-100 text-yellow-700',
        icon: <Loader2 className="h-5 w-5 animate-spin" />,
        action: 'Continue Onboarding',
      },
      ONBOARDING_COMPLETED: {
        label: 'Under Review',
        description: 'Your profile is being reviewed by HR. You will be notified once approved.',
        color: 'bg-purple-100 text-purple-700',
        icon: <Clock className="h-5 w-5" />,
        action: null,
      },
      CHANGES_REQUESTED: {
        label: 'Changes Requested',
        description: 'HR has requested some changes to your profile.',
        color: 'bg-orange-100 text-orange-700',
        icon: <AlertCircle className="h-5 w-5" />,
        action: 'Update Profile',
      },
      APPROVED: {
        label: 'Approved',
        description: 'Your profile has been approved! Welcome to the team.',
        color: 'bg-green-100 text-green-700',
        icon: <CheckCircle2 className="h-5 w-5" />,
        action: null,
      },
      ACTIVE: {
        label: 'Active',
        description: 'Your account is active and ready to use.',
        color: 'bg-green-100 text-green-700',
        icon: <CheckCircle2 className="h-5 w-5" />,
        action: null,
      },
    };

    return statusMap[onboardingStatus.status];
  };

  const handleOnboardingAction = () => {
    if (onboardingStatus?.inviteToken) {
      router.push(`/onboard?token=${onboardingStatus.inviteToken}`);
    }
  };

  const statCards = [
    {
      title: 'Today\'s Hours',
      value: stats.todayHours.toFixed(1),
      subtitle: 'hours logged',
      icon: <Clock className="h-6 w-6" />,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'This Week',
      value: stats.weekHours.toFixed(1),
      subtitle: 'hours logged',
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'from-purple-500 to-indigo-500',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'This Month',
      value: stats.monthHours.toFixed(1),
      subtitle: 'hours logged',
      icon: <Calendar className="h-6 w-6" />,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Leave Balance',
      value: stats.remainingLeaves,
      subtitle: 'days remaining',
      icon: <Calendar className="h-6 w-6" />,
      color: 'from-orange-500 to-amber-500',
      bgColor: 'bg-orange-50',
    },
  ];

  const quickActions = [
    {
      title: 'Log Time',
      description: 'Log your work hours',
      icon: <Clock className="h-5 w-5" />,
      href: '/employee/timesheets',
      color: 'from-blue-600 to-cyan-600',
    },
    {
      title: 'Apply Leave',
      description: 'Request time off',
      icon: <Calendar className="h-5 w-5" />,
      href: '/employee/leave',
      color: 'from-purple-600 to-indigo-600',
    },
    {
      title: 'View Payslips',
      description: 'Download payslips',
      icon: <DollarSign className="h-5 w-5" />,
      href: '/employee/payslips',
      color: 'from-green-600 to-emerald-600',
    },
    {
      title: 'My Documents',
      description: 'View your documents',
      icon: <FileText className="h-5 w-5" />,
      href: '/employee/documents',
      color: 'from-orange-600 to-amber-600',
    },
  ];

  const recentActivities = [
    {
      title: 'Timesheet Approved',
      description: 'Your timesheet for Week 40 has been approved',
      time: '2 hours ago',
      icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    },
    {
      title: 'Leave Request Pending',
      description: 'Your leave request for Oct 15-16 is pending approval',
      time: '1 day ago',
      icon: <AlertCircle className="h-5 w-5 text-yellow-600" />,
    },
    {
      title: 'New Payslip Available',
      description: 'Payslip for October 2025 is now available',
      time: '3 days ago',
      icon: <DollarSign className="h-5 w-5 text-blue-600" />,
    },
  ];

  return (
    <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName || 'Employee'}! 👋
          </h1>
          <p className="text-muted-foreground mt-2">
            Here's what's happening with your work today
          </p>
        </div>

        {/* Onboarding Status Card */}
        {!loadingOnboarding && onboardingStatus && onboardingStatus.status !== 'ACTIVE' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getOnboardingStatusInfo()?.icon}
                    <div>
                      <CardTitle className="text-lg">Onboarding Status</CardTitle>
                      <CardDescription className="mt-1">
                        {getOnboardingStatusInfo()?.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getOnboardingStatusInfo()?.color}>
                    {getOnboardingStatusInfo()?.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Profile Completion
                      </span>
                      <span className="text-sm font-semibold text-purple-600">
                        {onboardingStatus.completedSteps} / {onboardingStatus.totalSteps} steps
                      </span>
                    </div>
                    <Progress
                      value={(onboardingStatus.completedSteps / onboardingStatus.totalSteps) * 100}
                      className="h-2"
                    />
                  </div>

                  {/* Changes Requested Notice */}
                  {onboardingStatus.status === 'CHANGES_REQUESTED' && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm font-medium text-orange-900 mb-1">Action Required:</p>
                      <p className="text-sm text-orange-700">Please review and update your profile information as requested by HR.</p>
                    </div>
                  )}

                  {/* Action Button */}
                  {getOnboardingStatusInfo()?.action && (
                    <Button
                      onClick={handleOnboardingAction}
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      {getOnboardingStatusInfo()?.action}
                    </Button>
                  )}

                  {/* Timeline */}
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-3">Onboarding Journey</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-gray-600">Account Created</span>
                      </div>
                      <div className={`flex items-center gap-2 ${onboardingStatus.status !== 'INVITED' ? 'opacity-100' : 'opacity-50'}`}>
                        {onboardingStatus.status !== 'INVITED' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                        )}
                        <span className="text-xs text-gray-600">Profile Submitted</span>
                      </div>
                      <div className={`flex items-center gap-2 ${['ONBOARDING_COMPLETED', 'APPROVED', 'ACTIVE'].includes(onboardingStatus.status) ? 'opacity-100' : 'opacity-50'}`}>
                        {['ONBOARDING_COMPLETED', 'APPROVED', 'ACTIVE'].includes(onboardingStatus.status) ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                        )}
                        <span className="text-xs text-gray-600">Under HR Review</span>
                      </div>
                      <div className={`flex items-center gap-2 ${['APPROVED', 'ACTIVE'].includes(onboardingStatus.status) ? 'opacity-100' : 'opacity-50'}`}>
                        {['APPROVED', 'ACTIVE'].includes(onboardingStatus.status) ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                        )}
                        <span className="text-xs text-gray-600">Approved & Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white`}>
                      {stat.icon}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Frequently used actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickActions.map((action) => (
                    <button
                      key={action.title}
                      onClick={() => router.push(action.href)}
                      className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all text-left"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-white flex-shrink-0`}>
                        {action.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{action.title}</h3>
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className="flex-shrink-0 mt-1">{activity.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Additional Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Leave Summary</CardTitle>
              <CardDescription>Your leave status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Leaves</span>
                  <span className="font-semibold">20 days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Used</span>
                  <span className="font-semibold text-orange-600">0 days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Remaining</span>
                  <span className="font-semibold text-green-600">{stats.remainingLeaves} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pending Approval</span>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                    {stats.pendingLeaves} requests
                  </Badge>
                </div>
              </div>
              <Button className="w-full mt-4" onClick={() => router.push('/employee/leave')}>
                Apply for Leave
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Holidays</CardTitle>
              <CardDescription>Company holidays</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Diwali</p>
                    <p className="text-xs text-muted-foreground">Nov 1, 2025</p>
                  </div>
                  <Badge variant="outline" className="bg-purple-100 text-purple-700">
                    Holiday
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Christmas</p>
                    <p className="text-xs text-muted-foreground">Dec 25, 2025</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700">
                    Holiday
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">New Year</p>
                    <p className="text-xs text-muted-foreground">Jan 1, 2026</p>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-700">
                    Holiday
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
