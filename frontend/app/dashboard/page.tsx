'use client';

/**
 * Dashboard Page
 * Role-based dashboard with different views for each role
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Clock,
  Calendar,
  DollarSign,
  Users,
  FileText,
  LogOut,
  Loader2,
  FolderKanban,
  UserPlus,
  ClipboardCheck,
} from 'lucide-react';
import { Role } from '@prisma/client';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Statistic Card Component
interface StatisticCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'red' | 'yellow';
  suffix?: string;
}

function StatisticCard({ title, value, icon, color, suffix }: StatisticCardProps) {
  const colorClasses = {
    green: 'from-green-500 to-emerald-500',
    blue: 'from-blue-500 to-cyan-500',
    red: 'from-red-500 to-rose-500',
    yellow: 'from-yellow-500 to-orange-500',
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
            <p className="text-3xl font-bold text-gray-900">
              {value}
              {suffix && <span className="text-lg ml-1">{suffix}</span>}
            </p>
          </div>
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white shadow-lg`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
  tenant: {
    name: string;
  };
  lastLoginAt: string | null;
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (data.success) {
        setUser(data.data);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getRoleDashboard = () => {
    switch (user.role) {
      case Role.ADMIN:
        return <AdminDashboard />;
      case Role.MANAGER:
        return <ManagerDashboard />;
      case Role.ACCOUNTANT:
        return <AccountantDashboard />;
      case Role.EMPLOYEE:
        return <EmployeeDashboard />;
      default:
        return <DefaultDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {user.name}!
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  <span>{user.tenant.name}</span>
                  <span>•</span>
                  <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                    {user.role}
                  </Badge>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="destructive"
                className="w-full sm:w-auto"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Role-based Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {getRoleDashboard()}
      </motion.div>
    </div>
  );
}

// Admin Dashboard
function AdminDashboard() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h2>
        <p className="text-muted-foreground">Full system access and control</p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={itemVariants}>
          <StatisticCard
            title="Total Employees"
            value={0}
            icon={<User className="h-6 w-6" />}
            color="green"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatisticCard
            title="Departments"
            value={0}
            icon={<Users className="h-6 w-6" />}
            color="blue"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatisticCard
            title="Active Projects"
            value={0}
            icon={<FileText className="h-6 w-6" />}
            color="red"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatisticCard
            title="Pending Approvals"
            value={0}
            icon={<Clock className="h-6 w-6" />}
            color="yellow"
          />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = '/admin/invite-employee'}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite New Employee
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = '/admin/onboarding'}
              >
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Review Onboarding
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = '/admin/users'}
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Users
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = '/admin/employees'}
              >
                <User className="w-4 h-4 mr-2" />
                Manage Employees
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = '/admin/clients'}
              >
                <FileText className="w-4 h-4 mr-2" />
                Manage Clients
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = '/admin/projects'}
              >
                <FolderKanban className="w-4 h-4 mr-2" />
                Manage Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// Manager Dashboard
function ManagerDashboard() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Manager Dashboard</h2>
        <p className="text-muted-foreground">Team management and approvals</p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={itemVariants}>
          <StatisticCard
            title="Team Members"
            value={0}
            icon={<User className="h-6 w-6" />}
            color="green"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatisticCard
            title="Pending Timesheets"
            value={0}
            icon={<Clock className="h-6 w-6" />}
            color="yellow"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatisticCard
            title="Leave Requests"
            value={0}
            icon={<Calendar className="h-6 w-6" />}
            color="blue"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatisticCard
            title="Active Projects"
            value={0}
            icon={<FileText className="h-6 w-6" />}
            color="red"
          />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = '/manager/invite-employee'}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite New Employee
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = '/manager/onboarding'}
              >
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Review Onboarding
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = '/admin/projects'}
              >
                <FolderKanban className="w-4 h-4 mr-2" />
                Manage Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// Accountant Dashboard
function AccountantDashboard() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Accountant Dashboard</h2>
        <p className="text-muted-foreground">Financial management and payroll</p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={itemVariants}>
          <StatisticCard
            title="Pending Invoices"
            value={0}
            icon={<FileText className="h-6 w-6" />}
            color="yellow"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatisticCard
            title="Total Revenue"
            value={0}
            icon={<DollarSign className="h-6 w-6" />}
            color="green"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatisticCard
            title="Payroll Due"
            value={0}
            icon={<Calendar className="h-6 w-6" />}
            color="red"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatisticCard
            title="Employees"
            value={0}
            icon={<User className="h-6 w-6" />}
            color="blue"
          />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Accountant Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
                Process Payroll
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
                Manage Invoices
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
                Generate Financial Reports
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
                Track Expenses
              </li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// Employee Dashboard
function EmployeeDashboard() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Employee Dashboard</h2>
        <p className="text-muted-foreground">Your personal workspace</p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={itemVariants}>
          <StatisticCard
            title="Hours This Week"
            value={0}
            icon={<Clock className="h-6 w-6" />}
            color="green"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatisticCard
            title="Leave Balance"
            value={0}
            suffix="days"
            icon={<Calendar className="h-6 w-6" />}
            color="blue"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatisticCard
            title="Active Projects"
            value={0}
            icon={<FileText className="h-6 w-6" />}
            color="yellow"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatisticCard
            title="Pending Tasks"
            value={0}
            icon={<Clock className="h-6 w-6" />}
            color="red"
          />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
                Submit Timesheet
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
                Request Leave
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
                View Projects
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
                Update Profile
              </li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// Default Dashboard
function DefaultDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Dashboard</CardTitle>
          <CardDescription>Welcome to Zenora.ai</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your dashboard will be configured based on your role and permissions.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
