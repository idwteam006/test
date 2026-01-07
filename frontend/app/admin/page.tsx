'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  Activity,
  FolderKanban,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Building2,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-[1400px] mx-auto space-y-6"
      >
        {/* Welcome Banner */}
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Activity className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-purple-100">Welcome back! Here's your system overview</p>
                    <p className="text-sm text-purple-200 mt-1">
                      {currentTime.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">System Healthy</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div variants={itemVariants}>
            <Card className="hover:shadow-lg transition-shadow border-l-4 border-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Total Users</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{stats.totalUsers}</p>
                    <p className="text-xs text-slate-500 mt-1">All employees</p>
                  </div>
                  <Users className="w-12 h-12 text-blue-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="hover:shadow-lg transition-shadow border-l-4 border-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Active Sessions</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{stats.activeSessions}</p>
                    <p className="text-xs text-slate-500 mt-1">Right now</p>
                  </div>
                  <Activity className="w-12 h-12 text-green-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="hover:shadow-lg transition-shadow border-l-4 border-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Active Projects</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{stats.activeProjects}</p>
                    <p className="text-xs text-slate-500 mt-1">{stats.organization.projects.completed} completed</p>
                  </div>
                  <FolderKanban className="w-12 h-12 text-purple-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="hover:shadow-lg transition-shadow border-l-4 border-orange-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Pending Actions</p>
                    <p className="text-3xl font-bold text-orange-600 mt-1">{stats.pendingActions}</p>
                    <p className="text-xs text-orange-600 mt-1">{stats.pendingActions > 0 ? 'Requires attention' : 'All clear'}</p>
                  </div>
                  <AlertTriangle className="w-12 h-12 text-orange-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Alerts & Organization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Critical Alerts */}
          <motion.div variants={itemVariants}>
            <Card className="h-full shadow-lg">
              <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Critical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {stats.alerts && stats.alerts.length > 0 ? (
                    stats.alerts.map((alert: any, idx: number) => (
                      <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${
                        alert.type === 'urgent' ? 'bg-red-50 border-red-500' : 'bg-yellow-50 border-yellow-500'
                      }`}>
                        <Badge variant={alert.type === 'urgent' ? 'destructive' : 'secondary'}
                               className={alert.type === 'urgent' ? 'mt-0.5' : 'mt-0.5 bg-yellow-100 text-yellow-800'}>
                          {alert.type === 'urgent' ? 'URGENT' : 'WARNING'}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{alert.description}</p>
                          {alert.action && (
                            <Button size="sm" variant="outline" className="h-7 text-xs mt-2"
                                    onClick={() => router.push(alert.action)}>
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">No critical alerts</p>
                      <p className="text-xs text-slate-400 mt-1">All systems operational</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Organization Overview */}
          <motion.div variants={itemVariants}>
            <Card className="h-full shadow-lg">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Organization Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                    <p className="text-xs text-slate-600 font-medium">Employees</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{stats.organization.totalEmployees}</p>
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      <p>Admin: {stats.organization.employeesByRole.admin || 0} • Manager: {stats.organization.employeesByRole.manager || 0}</p>
                      <p>Employee: {stats.organization.employeesByRole.employee || 0} • HR: {stats.organization.employeesByRole.hr || 0}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                    <p className="text-xs text-slate-600 font-medium">Departments</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{stats.organization.departments}</p>
                    <p className="text-xs text-slate-600 mt-2">Teams: {stats.organization.teams}</p>
                    <p className="text-xs text-slate-600">Active units</p>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                    <p className="text-xs text-slate-600 font-medium">Projects</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{stats.organization.projects.total}</p>
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      <p>On Track: {stats.organization.projects.onTrackPercentage}%</p>
                      <p>Active: {stats.organization.projects.active} • Done: {stats.organization.projects.completed}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg">
                    <p className="text-xs text-slate-600 font-medium">Revenue</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                      ${((stats.organization.revenue?.total || 0) / 1000000).toFixed(1)}M
                    </p>
                    <p className="text-xs text-slate-600 mt-2">{stats.organization.activeClients || 0} active clients</p>
                    <p className="text-xs text-green-600">↑ {stats.organization.revenue?.growth || 0}% this month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Departments & Security */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Departments */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-violet-600" />
                  Top Departments
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {stats.topDepartments && stats.topDepartments.length > 0 ? (
                    stats.topDepartments.map((dept: any) => (
                      <div key={dept.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{dept.name}</p>
                          <p className="text-xs text-slate-500">{dept.count} employees</p>
                        </div>
                        <div className="text-right">
                          <Badge className={`bg-${dept.color}-100 text-${dept.color}-700`}>
                            {dept.util}% util
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-sm text-slate-500 py-4">No departments yet</p>
                  )}
                  <Button variant="link" className="w-full text-sm" onClick={() => router.push('/admin/organization')}>
                    View All Departments →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Security */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  Security & Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <p className="text-xs text-slate-600">Failed Logins</p>
                    <p className="text-2xl font-bold text-red-600">{stats.security.failedLogins}</p>
                    <p className="text-xs text-slate-400">Last 24h</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-xs text-slate-600">Successful</p>
                    <p className="text-2xl font-bold text-green-600">{stats.security.successfulLogins}</p>
                    <p className="text-xs text-slate-400">Last 24h</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-slate-700">Backup: {stats.security.backupStatus} ({stats.security.backupTime})</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-slate-700">Security audit: Passed</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-slate-700">SSL: Expires in {stats.security.sslDaysRemaining} days</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-slate-700">GDPR: Up to date</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-600" />
                Recent System Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                {stats.recentActivity && stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((activity: any, idx: number) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-3 bg-${activity.color}-50 rounded-lg hover:bg-${activity.color}-100 transition-colors`}
                    >
                      <div className={`w-2 h-2 bg-${activity.color}-500 rounded-full`}></div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-900">{activity.text}</p>
                      </div>
                      <p className="text-xs text-slate-400">{activity.time}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-slate-500 py-4">No recent activity</p>
                )}
              </div>
              <Button variant="link" className="w-full mt-4 text-sm">View All Activity →</Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
