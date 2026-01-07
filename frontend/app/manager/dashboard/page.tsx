'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  FolderKanban,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';

export default function ManagerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock data - replace with real API calls
  const stats = {
    teamSize: 12,
    activeProjects: 5,
    pendingApprovals: 8,
    tasksCompleted: 45,
    tasksTotal: 60,
  };

  const pendingLeaveRequests = [
    { id: 1, name: 'John Doe', dates: 'Oct 15-17', days: 3, type: 'Medical' },
    { id: 2, name: 'Jane Smith', dates: 'Oct 20', days: 1, type: 'Personal' },
    { id: 3, name: 'Mike Johnson', dates: 'Oct 25-29', days: 5, type: 'Vacation' },
  ];

  const teamMembers = [
    { id: 1, name: 'John Doe', status: 'active', task: 'Dashboard UI', utilization: 85 },
    { id: 2, name: 'Jane Smith', status: 'break', task: 'API Integration', utilization: 92 },
    { id: 3, name: 'Mike Johnson', status: 'leave', task: '-', utilization: 0 },
    { id: 4, name: 'Sarah Lee', status: 'active', task: 'Bug Fixes', utilization: 78 },
  ];

  const activeProjects = [
    {
      id: 1,
      name: 'E-commerce Platform',
      client: 'ABC Corp',
      deadline: 'Oct 30, 2025',
      progress: 75,
      team: 5,
      tasksPending: 12,
      tasksCompleted: 45,
      status: 'on-track',
    },
    {
      id: 2,
      name: 'Mobile App Redesign',
      client: 'XYZ Inc',
      deadline: 'Nov 15, 2025',
      progress: 60,
      team: 4,
      tasksPending: 8,
      tasksCompleted: 20,
      status: 'at-risk',
    },
  ];

  const statCards = [
    {
      title: 'Team Size',
      value: stats.teamSize,
      subtitle: 'members',
      icon: <Users className="h-6 w-6" />,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Active Projects',
      value: stats.activeProjects,
      subtitle: 'in progress',
      icon: <FolderKanban className="h-6 w-6" />,
      color: 'from-purple-500 to-indigo-500',
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingApprovals,
      subtitle: 'need attention',
      icon: <AlertCircle className="h-6 w-6" />,
      color: 'from-orange-500 to-amber-500',
    },
    {
      title: 'Tasks Completed',
      value: `${stats.tasksCompleted}/${stats.tasksTotal}`,
      subtitle: 'this week',
      icon: <CheckCircle className="h-6 w-6" />,
      color: 'from-green-500 to-emerald-500',
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Manager Dashboard - {user?.firstName} {user?.lastName} 👋
        </h1>
        <p className="text-muted-foreground mt-2">
          {user?.department?.name || 'Engineering'} Department
        </p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Actions */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Pending Actions
            </CardTitle>
            <CardDescription>Items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-red-900">Leave Requests Pending Approval</h3>
                  <Badge variant="destructive">{pendingLeaveRequests.length}</Badge>
                </div>
                <div className="space-y-2">
                  {pendingLeaveRequests.map(request => (
                    <div key={request.id} className="flex items-center justify-between text-sm p-2 bg-white rounded">
                      <div>
                        <p className="font-medium">{request.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.dates} ({request.days} days) - {request.type}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-3" onClick={() => router.push('/manager/leave-approvals')}>
                  Review All Requests
                </Button>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-yellow-900">Timesheet Approvals</h3>
                  <Badge className="bg-yellow-100 text-yellow-700">5</Badge>
                </div>
                <p className="text-sm text-yellow-700 mb-3">Review weekly timesheets</p>
                <Button className="w-full" variant="outline" onClick={() => router.push('/manager/timesheet-approvals')}>
                  Review All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              My Team Overview
            </CardTitle>
            <CardDescription>Engineering - Alpha Squad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.teamSize}</p>
                  <p className="text-xs text-muted-foreground">Total Members</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">10</p>
                  <p className="text-xs text-muted-foreground">Present Today</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">2</p>
                  <p className="text-xs text-muted-foreground">On Leave</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Name</th>
                      <th className="text-left px-3 py-2 font-medium">Status</th>
                      <th className="text-right px-3 py-2 font-medium">Util%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map(member => (
                      <tr key={member.id} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.task}</p>
                        </td>
                        <td className="px-3 py-2">
                          {member.status === 'active' && <Badge className="bg-green-100 text-green-700">Active</Badge>}
                          {member.status === 'break' && <Badge className="bg-blue-100 text-blue-700">Break</Badge>}
                          {member.status === 'leave' && <Badge className="bg-yellow-100 text-yellow-700">Leave</Badge>}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{member.utilization}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button className="w-full" variant="outline" onClick={() => router.push('/manager/team')}>
                View Full Team
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-indigo-600" />
            Active Projects
          </CardTitle>
          <CardDescription>Projects you are managing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeProjects.map(project => (
              <div key={project.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Client: {project.client} | Deadline: {project.deadline}
                    </p>
                  </div>
                  {project.status === 'on-track' ? (
                    <Badge className="bg-green-100 text-green-700">🟢 On Track</Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-700">🟡 At Risk</Badge>
                  )}
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-semibold">{project.progress}% Complete</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex gap-4">
                    <span>Team: {project.team} members</span>
                    <span>Tasks: {project.tasksPending} pending, {project.tasksCompleted} completed</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">View Details</Button>
                    <Button size="sm">Update Status</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button className="w-full mt-4" variant="outline" onClick={() => router.push('/manager/projects')}>
            View All Projects
          </Button>
        </CardContent>
      </Card>

      {/* Team Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Completed Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">28</p>
            <p className="text-xs text-muted-foreground mt-1">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Hours Logged</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">450h</p>
            <p className="text-xs text-muted-foreground mt-1">Avg 37.5h/person</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Overtime</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">12h</p>
            <p className="text-xs text-muted-foreground mt-1">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">94%</p>
            <p className="text-xs text-green-600 mt-1">↑ 3% from last week</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
