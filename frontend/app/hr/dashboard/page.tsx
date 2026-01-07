'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  UserMinus,
  ClipboardCheck,
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar,
  Award,
  RefreshCw,
  AlertCircle,
  Receipt,
  DollarSign,
  CalendarDays,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingOnboarding: number;
  onLeave: number;
  pendingLeaveRequests: number;
  pendingExpenses: number;
  pendingExpenseAmount: number;
  exitTotal: number;
  exitPendingManager: number;
  exitManagerApproved: number;
  exitHrProcessing: number;
  exitClearancePending: number;
  pendingTimesheets: number;
  timesheetSubmitted: number;
  timesheetApproved: number;
  timesheetRejected: number;
  timesheetComplianceRate: number;
}

interface PendingOnboarding {
  id: string;
  name: string;
  email: string;
  status: string;
  date: string;
  completedAt: string | null;
}

interface LeaveRequest {
  id: string;
  name: string;
  email: string;
  dates: string;
  days: number;
  type: string;
  leaveType: string;
  reason: string;
  createdAt: string;
}

interface Expense {
  id: string;
  name: string;
  email: string;
  title: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  createdAt: string;
}

interface ExitRequest {
  id: string;
  name: string;
  email: string;
  department: string;
  lastWorkingDate: string;
  daysUntilExit: number;
  status: string;
  statusLabel: string;
  reasonCategory: string;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  formattedDate: string;
  daysUntil: number;
  type: string;
  isOptional: boolean;
}

interface Activity {
  id: string;
  action: string;
  name: string;
  time: string;
  timestamp: string;
  type: string;
  icon: string;
  color: string;
}

// Icon mapping for activities
const iconMap: Record<string, React.ComponentType<any>> = {
  CheckCircle,
  Calendar,
  UserPlus,
  UserMinus,
  Award,
  Clock,
  AlertCircle,
  Receipt,
};

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format expense category
const formatCategory = (category: string) => {
  const categories: Record<string, string> = {
    TRAVEL: 'Travel',
    MEALS: 'Meals',
    SUPPLIES: 'Supplies',
    EQUIPMENT: 'Equipment',
    SOFTWARE: 'Software',
    TRAINING: 'Training',
    OTHER: 'Other',
  };
  return categories[category] || category;
};

export default function HRDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingOnboarding: 0,
    onLeave: 0,
    pendingLeaveRequests: 0,
    pendingExpenses: 0,
    pendingExpenseAmount: 0,
    exitTotal: 0,
    exitPendingManager: 0,
    exitManagerApproved: 0,
    exitHrProcessing: 0,
    exitClearancePending: 0,
    pendingTimesheets: 0,
    timesheetSubmitted: 0,
    timesheetApproved: 0,
    timesheetRejected: 0,
    timesheetComplianceRate: 0,
  });
  const [pendingOnboarding, setPendingOnboarding] = useState<PendingOnboarding[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [exitRequests, setExitRequests] = useState<ExitRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      if (data.success) {
        setUser(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const fetchDashboardData = useCallback(async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);

      const response = await fetch('/api/hr/dashboard/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        setPendingOnboarding(data.pendingOnboarding || []);
        setLeaveRequests(data.leaveRequests || []);
        setExpenses(data.expenses || []);
        setExitRequests(data.exitRequests || []);
        setHolidays(data.holidays || []);
        setRecentActivity(data.recentActivity || []);

        if (showToast) {
          toast.success('Dashboard refreshed');
        }
      } else {
        console.error('Failed to fetch dashboard data:', data.error);
        if (showToast) {
          toast.error('Failed to refresh dashboard');
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      if (showToast) {
        toast.error('Failed to refresh dashboard');
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchDashboardData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  // Primary stats cards (first row)
  const primaryStats = [
    {
      title: 'Total Employees',
      value: stats.totalEmployees,
      subtitle: 'in organization',
      icon: <Users className="h-6 w-6" />,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Pending Onboarding',
      value: stats.pendingOnboarding,
      subtitle: 'need review',
      icon: <ClipboardCheck className="h-6 w-6" />,
      color: 'from-orange-500 to-amber-500',
      highlight: stats.pendingOnboarding > 0,
    },
    {
      title: 'Active Employees',
      value: stats.activeEmployees,
      subtitle: 'working today',
      icon: <CheckCircle className="h-6 w-6" />,
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: 'On Leave Today',
      value: stats.onLeave,
      subtitle: 'employees',
      icon: <Calendar className="h-6 w-6" />,
      color: 'from-purple-500 to-indigo-500',
    },
  ];

  // Secondary stats cards (second row)
  const secondaryStats = [
    {
      title: 'Pending Expenses',
      value: stats.pendingExpenses,
      subtitle: formatCurrency(stats.pendingExpenseAmount),
      icon: <Receipt className="h-5 w-5" />,
      color: 'from-amber-500 to-orange-500',
      highlight: stats.pendingExpenses > 0,
      link: '/hr/expenses/dashboard',
    },
    {
      title: 'Exit Requests',
      value: stats.exitTotal,
      subtitle: 'in progress',
      icon: <UserMinus className="h-5 w-5" />,
      color: 'from-red-500 to-pink-500',
      highlight: stats.exitTotal > 0,
      link: '/hr/exit-management',
    },
    {
      title: 'Pending Timesheets',
      value: stats.pendingTimesheets,
      subtitle: `${stats.timesheetComplianceRate}% compliance`,
      icon: <Clock className="h-5 w-5" />,
      color: 'from-indigo-500 to-blue-500',
      highlight: stats.pendingTimesheets > 0,
      link: '/hr/timesheets',
    },
    {
      title: 'Upcoming Holidays',
      value: holidays.length,
      subtitle: holidays[0]?.name || 'None scheduled',
      icon: <CalendarDays className="h-5 w-5" />,
      color: 'from-teal-500 to-cyan-500',
      link: '/hr/holidays',
    },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[calc(100vh-16rem)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            HR Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.firstName}! Here's your HR overview.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Primary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryStats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`hover:shadow-lg transition-shadow ${stat.highlight ? 'ring-2 ring-orange-300' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white`}>
                    {stat.icon}
                  </div>
                  {stat.highlight && (
                    <Badge className="bg-orange-100 text-orange-700">Action needed</Badge>
                  )}
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

      {/* Secondary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {secondaryStats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
          >
            <Card
              className={`hover:shadow-lg transition-shadow cursor-pointer ${stat.highlight ? 'ring-2 ring-orange-200' : ''}`}
              onClick={() => router.push(stat.link)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-white`}>
                    {stat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-muted-foreground truncate">{stat.subtitle}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Onboarding */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-5 w-5 text-orange-600" />
              Pending Onboarding
              {pendingOnboarding.length > 0 && (
                <Badge className="bg-orange-100 text-orange-700 ml-auto">
                  {pendingOnboarding.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingOnboarding.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
                <p className="text-sm">No pending submissions</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingOnboarding.slice(0, 3).map(employee => (
                  <div key={employee.id} className="flex items-center justify-between p-2 border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{employee.name}</p>
                      <p className="text-xs text-muted-foreground">{employee.date}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => router.push(`/hr/onboarding/review/${employee.id}`)}>
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button className="w-full mt-3" variant="outline" size="sm" onClick={() => router.push('/hr/onboarding')}>
              View All
            </Button>
          </CardContent>
        </Card>

        {/* Pending Leave Requests */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-blue-600" />
              Leave Requests
              {leaveRequests.length > 0 && (
                <Badge className="bg-blue-100 text-blue-700 ml-auto">
                  {stats.pendingLeaveRequests}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaveRequests.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
                <p className="text-sm">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaveRequests.slice(0, 3).map(request => (
                  <div key={request.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{request.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.dates} • {request.days}d • {request.type}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => router.push('/hr/leave-requests')}>
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button className="w-full mt-3" variant="outline" size="sm" onClick={() => router.push('/hr/leave-requests')}>
              View All
            </Button>
          </CardContent>
        </Card>

        {/* Pending Expenses */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-5 w-5 text-amber-600" />
              Pending Expenses
              {expenses.length > 0 && (
                <Badge className="bg-amber-100 text-amber-700 ml-auto">
                  {formatCurrency(stats.pendingExpenseAmount)}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
                <p className="text-sm">No pending expenses</p>
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.slice(0, 3).map(expense => (
                  <div key={expense.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{expense.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(expense.amount)} • {formatCategory(expense.category)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => router.push('/hr/expenses/dashboard')}>
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button className="w-full mt-3" variant="outline" size="sm" onClick={() => router.push('/hr/expenses/dashboard')}>
              View All
            </Button>
          </CardContent>
        </Card>

        {/* Exit Requests */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserMinus className="h-5 w-5 text-red-600" />
              Exit Requests
              {exitRequests.length > 0 && (
                <Badge className="bg-red-100 text-red-700 ml-auto">
                  {stats.exitTotal}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {exitRequests.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
                <p className="text-sm">No active exits</p>
              </div>
            ) : (
              <div className="space-y-2">
                {exitRequests.slice(0, 3).map(exit => (
                  <div key={exit.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{exit.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {exit.daysUntilExit > 0 ? `${exit.daysUntilExit} days left` : 'Today'} • {exit.statusLabel}
                      </p>
                    </div>
                    <Badge variant="outline" className={
                      exit.status === 'CLEARANCE_PENDING' ? 'border-orange-300 text-orange-700' :
                      exit.status === 'HR_PROCESSING' ? 'border-blue-300 text-blue-700' :
                      'border-gray-300'
                    }>
                      {exit.statusLabel}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <Button className="w-full mt-3" variant="outline" size="sm" onClick={() => router.push('/hr/exit-management')}>
              View All
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Holidays + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Holidays */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-5 w-5 text-teal-600" />
              Upcoming Holidays
            </CardTitle>
          </CardHeader>
          <CardContent>
            {holidays.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 text-slate-400" />
                <p className="text-sm">No upcoming holidays</p>
              </div>
            ) : (
              <div className="space-y-2">
                {holidays.slice(0, 4).map(holiday => (
                  <div key={holiday.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{holiday.name}</p>
                      <p className="text-xs text-muted-foreground">{holiday.formattedDate}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={
                        holiday.isOptional ? 'border-purple-300 text-purple-700' :
                        holiday.type === 'PUBLIC' ? 'border-green-300 text-green-700' :
                        'border-blue-300 text-blue-700'
                      }>
                        {holiday.daysUntil === 0 ? 'Today' :
                         holiday.daysUntil === 1 ? 'Tomorrow' :
                         `${holiday.daysUntil}d`}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button className="w-full mt-3" variant="outline" size="sm" onClick={() => router.push('/hr/holidays')}>
              Manage Holidays
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-2 text-slate-400" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 6).map(activity => {
                  const Icon = iconMap[activity.icon] || Clock;
                  return (
                    <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                      <div className={`w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-sm text-muted-foreground truncate">{activity.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/hr/invite-employee')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Invite Employee</h3>
                <p className="text-xs text-muted-foreground">Send onboarding invite</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/hr/bulk-invite')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Bulk Invite</h3>
                <p className="text-xs text-muted-foreground">Import employees</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/hr/timesheets/dashboard')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Timesheet Reports</h3>
                <p className="text-xs text-muted-foreground">Analytics & insights</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/hr/reports')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">HR Reports</h3>
                <p className="text-xs text-muted-foreground">Generate reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
